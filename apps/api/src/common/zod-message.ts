import { ZodError } from 'zod';

export function zodClientMessage(error: ZodError) {
  return error.issues[0]?.message || 'Please check the form and try again.';
}
