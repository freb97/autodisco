import { z } from 'zod';

export const Posts = z.array(z.object({
  "userId": z.number(),
  "id": z.number(),
  "title": z.string(),
  "body": z.string(),
  "link": z.string(),
  "comment_count": z.number()
}));
