import type { z } from 'zod'
import { createHash } from 'node:crypto'

/**
 * Create a fast hash of a Zod schema definition for comparison
 *
 * @param schema Zod schema to hash
 *
 * @returns Hash string
 */
export function getSchemaHash(schema: z.ZodType): string {
  return createHash('sha256').update(JSON.stringify(schema.def)).digest('hex')
}
