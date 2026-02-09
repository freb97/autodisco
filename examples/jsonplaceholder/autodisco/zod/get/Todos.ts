import { z } from 'zod';

export const Todos = z.array(z.object({
  "userId": z.number(),
  "id": z.number(),
  "title": z.string(),
  "completed": z.boolean()
}));
