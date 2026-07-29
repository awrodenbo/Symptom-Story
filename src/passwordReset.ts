const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_RESET_REDIRECT_URL =
  process.env.EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL?.trim() || 'symptomstory://reset-password';

export function normalizeResetEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) throw new Error('Enter a valid email address.');
  return email;
}

export function passwordResetErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
    return 'Please wait a moment before requesting another reset email.';
  }
  return 'We could not send the reset email. Check your connection and try again.';
}
