import { z } from 'zod';

export const Comments = z.array(z.object({
  "postId": z.number(),
  "id": z.number(),
  "name": z.string(),
  "email": z.string(),
  "body": z.string()
}));
