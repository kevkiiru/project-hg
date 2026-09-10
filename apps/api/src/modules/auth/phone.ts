// Kenyan phone normalization to E.164 (+2547XXXXXXXX / +2541XXXXXXXX).
export function normalizeKePhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, '');
  let m = digits.match(/^\+(254\d{9})$/);
  if (m) return `+${m[1]}`;
  m = digits.match(/^254(\d{9})$/);
  if (m) return `+254${m[1]}`;
  m = digits.match(/^0([17]\d{8})$/);
  if (m) return `+254${m[1]}`;
  return null;
}

export function assertKePhone(input: string): string {
  const normalized = normalizeKePhone(input);
  if (!normalized) {
    throw new Error('Enter a Kenyan phone number like 07XXXXXXXX or +2547XXXXXXXX.');
  }
  return normalized;
}
