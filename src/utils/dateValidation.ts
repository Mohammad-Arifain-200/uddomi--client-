export function getLocalDateString(offsetDays = 0): string {
  const now = new Date();
  const local = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays);
  const year = local.getFullYear();
  const month = String(local.getMonth() + 1).padStart(2, '0');
  const day = String(local.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isValidCalendarDate(dateStr: string): boolean {
  if (typeof dateStr !== 'string') return false;
  const trimmed = dateStr.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

export function validateFutureEventDate(dateStr: string): { valid: boolean; message?: string } {
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim()) {
    return { valid: false, message: 'Please select an event date.' };
  }

  const trimmed = dateStr.trim();
  if (!isValidCalendarDate(trimmed)) {
    return { valid: false, message: 'Please provide a valid calendar date in YYYY-MM-DD format.' };
  }

  const today = getLocalDateString(0);
  if (trimmed <= today) {
    return {
      valid: false,
      message: 'Event date must be strictly in the future (tomorrow or later). Today and past dates are not allowed.',
    };
  }

  return { valid: true };
}
