import { z } from 'zod';

export const Roles = z.array(z.object({
  "id": z.number(),
  "name": z.string(),
  "description": z.string()
}));
