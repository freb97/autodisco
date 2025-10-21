import { z } from 'zod'

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
    return z.array(inferZodSchemaFromValue(value[0]))
  }

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

  return z.any()
}
