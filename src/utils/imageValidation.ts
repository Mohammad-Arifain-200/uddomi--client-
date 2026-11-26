export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
] as const;

export const NON_IMAGE_EXTENSIONS = [
  '.pdf',
  '.html',
  '.htm',
  '.php',
  '.asp',
  '.aspx',
  '.txt',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.zip',
  '.rar',
  '.mp4',
  '.mp3',
  '.json',
  '.xml',
  '.svg',
];

export function estimateDataUrlBytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return 0;
  const base64 = dataUrl.slice(commaIdx + 1);
  return Math.floor((base64.length * 3) / 4);
}

export function isSafeLocalImageAssetPath(rawUrl: string): boolean {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed.startsWith('/assets/') || trimmed.includes('..')) {
    return false;
  }
  return /^\/assets\/[a-zA-Z0-9/_-]+\.(?:png|jpe?g|webp|gif|avif)$/i.test(trimmed);
}

export function validateClientImageInput(
  rawUrl: string,
  maxBytes = 5 * 1024 * 1024
): { valid: boolean; errorTitle: string; errorMessage: string } {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return {
      valid: false,
      errorTitle: 'Image Required',
      errorMessage: 'Please provide a valid image URL or upload an image file.',
    };
  }

  if (isSafeLocalImageAssetPath(trimmed)) {
    return { valid: true, errorTitle: '', errorMessage: '' };
  }

  if (trimmed.startsWith('data:')) {
    const normalized = trimmed.replace(/\s+/g, '');
    const match = /^data:(image\/[a-zA-Z0-9.+-]+)(?:;charset=[^;]+)?;base64,([A-Za-z0-9+/=]+)$/i.exec(
      normalized
    );
    if (!match) {
      return {
        valid: false,
        errorTitle: 'Unsupported Image Format',
        errorMessage: 'Uploaded image must be a valid base64 PNG, JPG, WEBP, or GIF image.',
      };
    }
    const mime = match[1].toLowerCase();
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(mime as any)) {
      return {
        valid: false,
        errorTitle: 'Unsupported Image Format',
        errorMessage: 'Only JPG, PNG, WEBP, GIF, and AVIF images are supported.',
      };
    }
    const bytes = estimateDataUrlBytes(normalized);
    if (bytes > maxBytes) {
      const limitMb = Math.round(maxBytes / (1024 * 1024));
      return {
        valid: false,
        errorTitle: 'Image Too Large',
        errorMessage: `Uploaded image exceeds the ${limitMb}MB limit. Please choose a smaller image.`,
      };
    }
    return { valid: true, errorTitle: '', errorMessage: '' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      valid: false,
      errorTitle: 'Invalid Image URL!',
      errorMessage: 'Please enter a valid URL starting with https:// or http://, or upload a photo.',
    };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      valid: false,
      errorTitle: 'Invalid Image URL!',
      errorMessage: 'Image URL protocol must be http:// or https://.',
    };
  }

  const pathname = parsed.pathname.toLowerCase();
  if (NON_IMAGE_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
    return {
      valid: false,
      errorTitle: 'Please Provide a Valid Image URL.',
      errorMessage: 'Non-image links (PDF, HTML, SVG, documents, or media files) are not accepted.',
    };
  }

  return { valid: true, errorTitle: '', errorMessage: '' };
}

export function resolveImageValidationHttpResult(
  ok: boolean,
  status: number,
  body: Record<string, any> | null | undefined
): { valid: boolean; errorTitle: string; errorMessage: string } {
  const payload = body && typeof body === 'object' ? body : {};
  if (!ok) {
    const fallbackMessage =
      status === 429
        ? 'Too many photo verification requests. Please wait a moment and try again.'
        : status >= 500
        ? 'Image verification service is temporarily unavailable. Please try again shortly.'
        : 'Unable to validate the provided image URL. Please use a valid image link.';
    const fallbackTitle = status === 429 ? 'Rate Limit Exceeded' : 'Invalid Photo URL!';
    return {
      valid: false,
      errorTitle: payload.errorTitle || fallbackTitle,
      errorMessage: payload.errorMessage || payload.error || payload.message || fallbackMessage,
    };
  }

  if (!payload.valid) {
    return {
      valid: false,
      errorTitle: payload.errorTitle || 'Invalid Photo URL!',
      errorMessage: payload.errorMessage || 'Please provide a valid image URL.',
    };
  }

  return { valid: true, errorTitle: '', errorMessage: '' };
}

export async function compressImageFileToDataUrl(
  file: File,
  options?: { maxWidth?: number; maxHeight?: number; quality?: number }
): Promise<string> {
  const maxWidth = options?.maxWidth ?? 600;
  const maxHeight = options?.maxHeight ?? 600;
  const quality = options?.quality ?? 0.84;

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        resolve(e.target.result);
      } else {
        reject(new Error('Failed to read image file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  // Preserve small GIFs directly so animations aren't lost
  if (file.type.toLowerCase() === 'image/gif' && file.size <= 512 * 1024) {
    return rawDataUrl;
  }

  if (typeof document === 'undefined') {
    return rawDataUrl;
  }

  return await new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const origW = img.naturalWidth || img.width;
      const origH = img.naturalHeight || img.height;
      if (!origW || !origH) {
        resolve(rawDataUrl);
        return;
      }

      const scale = Math.min(1, maxWidth / origW, maxHeight / origH);
      const targetW = Math.max(1, Math.round(origW * scale));
      const targetH = Math.max(1, Math.round(origH * scale));

      // Skip re-encoding if already small enough and under 120KB
      if (scale === 1 && estimateDataUrlBytes(rawDataUrl) <= 120 * 1024) {
        resolve(rawDataUrl);
        return;
      }

      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const outputMime =
          file.type.toLowerCase() === 'image/png' ? 'image/webp' : 'image/jpeg';
        const compressed = canvas.toDataURL(outputMime, quality);
        if (
          compressed.startsWith('data:image/') &&
          compressed.length < rawDataUrl.length
        ) {
          resolve(compressed);
        } else {
          resolve(rawDataUrl);
        }
      } catch {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}
