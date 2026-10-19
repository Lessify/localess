import { z } from 'zod';

/** `POST /api/auth/login`. */
export const zLogin = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});
export type Login = z.infer<typeof zLogin>;
