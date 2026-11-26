export function sanitizeCallbackUrl(
  rawUrl: string | null | undefined,
  fallback = '/events'
): string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return fallback;
  }

  const trimmed = rawUrl.trim();
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed === '/login' ||
    trimmed.startsWith('/login?') ||
    trimmed === '/register' ||
    trimmed.startsWith('/register?')
  ) {
    return fallback;
  }

  return trimmed;
}
