import { z } from 'zod'

import { getSchemaHash } from '../../helpers/schema'

/**
 * Merges multiple Zod schemas into one
 *
 * @param schemas Array of Zod schemas to merge
 *
 * @returns Merged Zod schema
 *
 * @example
 * ```typescript
 * const schema1 = z.object({ a: z.string(), b: z.object({ foo: z.string() }), c: z.number() });
 * const schema2 = z.object({ a: z.string(), b: z.object({ foo: z.string(), bar: z.string() }) });
 *
 * const mergedSchema = mergeSchemas([schema1, schema2]);
 *
 * // Resulting schema will be:
 * // z.object({
 * //   a: z.string(),
 * //   b: z.object({ foo: z.string(), bar: z.string().optional() }),
 * //   c: z.number().optional()
 * // });
 * ```
 */
export function merge(schemas: z.ZodType[]): z.ZodType {
  const objectSchemas = schemas.filter(schema => schema instanceof z.ZodObject) as z.ZodObject<any>[]

  if (objectSchemas.length === 0) {
    return schemas[0] || z.unknown()
  }

  if (objectSchemas.length === 1) {
    return objectSchemas[0]!
  }

  const allProperties = new Map<string, { schemas: z.ZodTypeAny[], count: number }>()

  for (const schema of objectSchemas) {
    for (const [key, value] of Object.entries(schema.shape)) {
      const zodValue = value as z.ZodTypeAny
      if (!allProperties.has(key)) {
        allProperties.set(key, { schemas: [zodValue], count: 1 })
      }
      else {
        const prop = allProperties.get(key)!
        prop.schemas.push(zodValue)
        prop.count++
      }
    }
  }

  const mergedShape: Record<string, z.ZodTypeAny> = {}

  for (const [key, { schemas: propSchemas, count }] of allProperties) {
    let mergedProp: z.ZodTypeAny

    const areAllObjects = propSchemas.every(s => s instanceof z.ZodObject)

    if (areAllObjects && propSchemas.length > 1) {
      mergedProp = merge(propSchemas)
    }
    else if (propSchemas.length === 1) {
      mergedProp = propSchemas[0]!
    }
    else {
      const hashes = propSchemas.map(s => getSchemaHash(s))
      const uniqueHashes = new Set(hashes)

      if (uniqueHashes.size === 1) {
        mergedProp = propSchemas[0]!
      }
      else {
        mergedProp = areAllObjects
          ? merge(propSchemas)
          : propSchemas.every(s => s instanceof z.ZodArray)
            ? z.array(merge(propSchemas.map(s => (s as z.ZodArray<any>).element).filter(Boolean)))
            : z.union(propSchemas)
      }
    }

    if (count === objectSchemas.length) {
      mergedShape[key] = mergedProp
    }
    else {
      mergedShape[key] = mergedProp.optional()
    }
  }

  return z.object(mergedShape)
}

/**
 * Infers a Zod object schema from a given object value
 *
 * @param value Object to infer the schema from
 *
 * @returns Inferred Zod object schema
 */
export function inferObject(value: object): z.ZodType {
  const shape: Record<string, any> = {}

  for (const [key, val] of Object.entries(value)) {
    shape[key] = inferFromValue(val)
  }

  return z.object(shape)
}

/**
 * Infers unique Zod schemas from a given array of values
 *
 * @param values Array of values to infer schemas from
 * @param discriminatorKey Optional discriminator key for union types
 *
 * @returns A map of unique Zod schemas
 */
export function inferUniqueArray(values: any[], discriminatorKey?: string): Map<string, z.ZodType> {
  const uniqueSchemas = new Map<string, z.ZodType>()

  for (const item of values) {
    const schema = inferFromValue(item)
    const hash = getSchemaHash(schema)

    if (discriminatorKey && schema instanceof z.ZodObject) {
      schema.shape[discriminatorKey] = z.literal(item[discriminatorKey])
    }

    if (!uniqueSchemas.has(hash)) {
      uniqueSchemas.set(hash, schema)
    }
  }

  return uniqueSchemas
}

/**
 * Infers a Zod array schema from a given array of values
 *
 * @param value Array of values to infer the schema from
 *
 * @returns Array of inferred Zod schemas
 */
export function inferArray(value: any[]): z.ZodArray {
  if (value.length === 0) {
    return z.array(z.any())
  }

  if (value.length === 1) {
    return z.array(inferFromValue(value[0]!))
  }

  const uniqueSchemas = inferUniqueArray(value)

  if (uniqueSchemas.size === 1) {
    return z.array(uniqueSchemas.values().next().value!)
  }

  const discriminatorCandidates = new Set<string>()

  for (const key of Object.keys(value[0]!)) {
    if (value.every(item => item && typeof item === 'object' && key in item && typeof item[key] !== 'object' && item[key] !== '')) {
      discriminatorCandidates.add(key)
    }
  }

  if (discriminatorCandidates.size === 0) {
    return z.array(merge(Array.from(uniqueSchemas.values())))
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
      return z.array(z.union(Array.from(inferUniqueArray(value, discriminator).values()) as [z.ZodType, z.ZodType, ...z.ZodType[]]))
    }
  }

  return z.array(merge(Array.from(uniqueSchemas.values())))
}

/**
 * Recursively infers a Zod schema from a given value
 *
 * @param value Object to infer the schema from
 *
 * @returns Inferred Zod schema
 */
export function inferFromValue(value: any): z.ZodType {
  if (value === null) {
    return z.null()
  }

  if (Array.isArray(value)) {
    return inferArray(value)
  }

  if (typeof value === 'object') {
    return inferObject(value)
  }

  if (typeof value === 'string')
    return z.string()
  if (typeof value === 'number')
    return z.number()
  if (typeof value === 'boolean')
    return z.boolean()

  return z.unknown()
}
