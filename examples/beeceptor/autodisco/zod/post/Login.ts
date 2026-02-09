import { z } from 'zod';

export const Login = z.object({
  "success": z.boolean(),
  "message": z.string(),
  "token": z.string()
});
