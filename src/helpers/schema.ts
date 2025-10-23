import { createHash } from 'node:crypto'
import { z } from 'zod'

/**
 * Create a fast hash of a Zod schema definition for comparison
 */
function getSchemaHash(schema: z.ZodType): string {
  return createHash('sha256').update(JSON.stringify(schema.def)).digest('hex')
}

/**
 * Recursively infers a Zod schema from a given value
 */
export function inferZodSchemaFromValue(value: any): z.ZodType {
  if (value === null) {
    return z.null()
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return z.array(z.any())
    }

    const schemas = value.map(item => inferZodSchemaFromValue(item))

    // Deduplicate schemas using hash-based lookup
    const schemaMap = new Map<string, z.ZodType>()
    for (const schema of schemas) {
      const hash = getSchemaHash(schema)
      if (!schemaMap.has(hash)) {
        schemaMap.set(hash, schema)
      }
    }

    const uniqueSchemas = Array.from(schemaMap.values())

    // If all elements have the same schema, return array of that type
    if (uniqueSchemas.length === 1) {
      return z.array(uniqueSchemas[0]!)
    }

    // If multiple different schemas, create a union
    return z.array(z.union(uniqueSchemas as [z.ZodType, z.ZodType, ...z.ZodType[]]))
  }

  // Iterate over all object properties and infer their schemas
  if (typeof value === 'object') {
    const shape: Record<string, any> = {}
    for (const [key, val] of Object.entries(value)) {
      shape[key] = inferZodSchemaFromValue(val)
    }
    return z.object(shape)
  }

  if (typeof value === 'string')
    return z.string()
  if (typeof value === 'number')
    return z.number()
  if (typeof value === 'boolean')
    return z.boolean()

  return z.unknown()
}
