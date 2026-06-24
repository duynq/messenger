import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('validation.invalidEmail'),
  password: z.string().min(1, 'validation.passwordRequired'),
});

export const registerSchema = z.object({
  email: z.string().email('validation.invalidEmail'),
  password: z.string().min(6, 'validation.passwordMin'),
  password_confirmation: z.string().min(1, 'validation.passwordConfirmRequired'),
  first_name: z.string().min(1, 'validation.firstNameRequired'),
  last_name: z.string().min(1, 'validation.lastNameRequired'),
}).refine((data) => data.password === data.password_confirmation, {
  message: 'validation.passwordMismatch',
  path: ['password_confirmation'],
});
