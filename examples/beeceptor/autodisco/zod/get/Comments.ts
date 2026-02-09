import { z } from 'zod';

export const Comments = z.object({
  "status": z.string(),
  "paths": z.array(z.string())
});
