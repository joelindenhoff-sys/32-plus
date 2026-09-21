export type ContactInput = { name: string; email: string; user_type: string; subject: string; message: string };
export function validateContact(input: ContactInput): string | null {
  if (!input.name.trim() || input.name.trim().length > 100) return 'Enter your name (up to 100 characters).';
  if (input.email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) return 'Enter a valid email address.';
  if (!['Tenant', 'Owner', 'Other'].includes(input.user_type)) return 'Choose Tenant, Owner or Other.';
  if (!input.subject.trim() || input.subject.trim().length > 160) return 'Enter a subject (up to 160 characters).';
  if (input.message.trim().length < 10 || input.message.trim().length > 5000) return 'Enter a message between 10 and 5,000 characters.';
  return null;
}
