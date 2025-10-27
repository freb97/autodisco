import { createHash } from 'node:crypto'
import { z } from 'zod'

/**
 * Create a fast hash of a Zod schema definition for comparison
 *
 * @param schema Zod schema to hash
 *
 * @returns Hash string
 */
function getSchemaHash(schema: z.ZodType): string {
  return createHash('sha256').update(JSON.stringify(schema.def)).digest('hex')
}

/**
 * Infers unique Zod schemas from a given array of values
 *
 * @param values Array of values to infer schemas from
 * @param discriminatorKey Optional discriminator key for union types
 *
 * @returns A map of unique Zod schemas
 */
function inferUniqueArraySchemas(values: any[], discriminatorKey?: string): Map<string, z.ZodType> {
  const uniqueSchemas = new Map<string, z.ZodType>()
  for (const item of values) {
    const schema = inferZodSchemaFromValue(item)
    if (discriminatorKey && schema instanceof z.ZodObject) {
      schema.shape[discriminatorKey] = z.literal(item[discriminatorKey])
    }
    const hash = getSchemaHash(schema)
    if (!uniqueSchemas.has(hash)) {
      uniqueSchemas.set(hash, schema)
    }
  }
  return uniqueSchemas
}

/**
 * Recursively infers a Zod schema from a given value
 *
 * @param value Object to infer the schema from
 *
 * @returns Inferred Zod schema
 */
export function inferZodSchemaFromValue(value: any): z.ZodType {
  if (value === null) {
    return z.null()
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return z.array(z.any())
    }

    if (value.length === 1) {
      return z.array(inferZodSchemaFromValue(value[0]!))
    }

    const discriminatorCandidates = new Set<string>()
    for (const key of Object.keys(value[0]!)) {
      if (value.every(item => item && typeof item === 'object' && key in item && typeof item[key] !== 'object')) {
        discriminatorCandidates.add(key)
      }
    }

    const uniqueSchemas = inferUniqueArraySchemas(value)

    if (uniqueSchemas.size === 1) {
      return z.array(uniqueSchemas.values().next().value!)
    }

    if (discriminatorCandidates.size === 0) {
      return z.array(z.union(Array.from(uniqueSchemas.values()) as [z.ZodType, z.ZodType, ...z.ZodType[]]))
    }

    for (const discriminator of discriminatorCandidates) {
      const groupedByDiscriminator = value.reduce((acc, item) => {
        const key = item[discriminator]
        if (!acc[key]) {
          acc[key] = []
        }
        acc[key].push(item)
        return acc
      }, {} as Record<string, any[]>)

      if (Object.keys(groupedByDiscriminator).length === uniqueSchemas.size) {
        return z.array(z.union(Array.from(inferUniqueArraySchemas(value, discriminator).values()) as [z.ZodType, z.ZodType, ...z.ZodType[]]))
      }
    }

    return z.array(z.union(Array.from(uniqueSchemas.values()) as [z.ZodType, z.ZodType, ...z.ZodType[]]))
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
