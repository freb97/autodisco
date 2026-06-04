import type { ProbeResult, SchemaResult } from '../../types'
import type { ParsedDiscoverConfig, ProbeConfig } from '../config'

import { z } from 'zod'

import { getSchemaHash } from '../../helpers/schema'

interface InferOptions {
  discriminators?: string[] | boolean
}

/**
 * Checks if a Zod schema is an optional schema (ZodOptional)
 *
 * @param schema The Zod schema to check
 *
 * @returns True if the schema is a ZodOptional, false otherwise
 */
function isOptionalSchema(schema: z.ZodTypeAny): schema is z.ZodOptional<any> {
  return schema instanceof z.ZodOptional
}

/**
 * Unwraps nested ZodOptional schemas to get the underlying schema
 *
 * @param schema The Zod schema to unwrap
 *
 * @returns The unwrapped Zod schema
 */
function unwrapOptionalSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
  let current = schema

  while (isOptionalSchema(current)) {
    current = current._zod.def.innerType as z.ZodTypeAny
  }

  return current
}

/**
 * Flattens nested ZodUnion schemas into a single array of member schemas
 *
 * @param schema The Zod schema to flatten
 *
 * @returns An array of Zod schemas representing the flattened union members
 */
function flattenUnionMembers(schema: z.ZodTypeAny): z.ZodTypeAny[] {
  if (schema instanceof z.ZodUnion) {
    return schema._zod.def.options.flatMap(option => flattenUnionMembers(option as z.ZodTypeAny))
  }

  return [schema]
}

/**
 * Deduplicates an array of Zod schemas by their structural content
 *
 * @param schemas Array of Zod schemas to deduplicate
 *
 * @returns Array of unique Zod schemas
 */
function dedupeSchemas(schemas: z.ZodTypeAny[]): z.ZodTypeAny[] {
  const seen = new Map<string, z.ZodTypeAny>()

  for (const schema of schemas) {
    const hash = getSchemaHash(schema)
    if (!seen.has(hash)) {
      seen.set(hash, schema)
    }
  }

  return Array.from(seen.values())
}

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
function merge(schemas: z.ZodType[]): z.ZodType {
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
    const hasOptionalVariant = propSchemas.some(isOptionalSchema)
    const normalizedSchemas = dedupeSchemas(propSchemas
      .map(unwrapOptionalSchema)
      .flatMap(flattenUnionMembers))

    const areAllObjects = normalizedSchemas.every(s => s instanceof z.ZodObject)

    if (areAllObjects && normalizedSchemas.length > 1) {
      mergedProp = merge(normalizedSchemas)
    }
    else if (normalizedSchemas.length === 1) {
      mergedProp = normalizedSchemas[0]!
    }
    else {
      if (normalizedSchemas.length === 1) {
        mergedProp = normalizedSchemas[0]!
      }
      else {
        mergedProp = areAllObjects
          ? merge(normalizedSchemas)
          : normalizedSchemas.every(s => s instanceof z.ZodArray)
            ? z.array(merge(normalizedSchemas.map(s => (s as z.ZodArray<any>).element).filter(Boolean)))
            : z.union(normalizedSchemas as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]])
      }
    }

    const shouldBeOptional = count !== objectSchemas.length || hasOptionalVariant
    mergedShape[key] = shouldBeOptional ? mergedProp.optional() : mergedProp
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
function inferObject(value: object, options?: InferOptions): z.ZodType {
  const shape: Record<string, any> = {}

  for (const [key, val] of Object.entries(value)) {
    shape[key] = inferFromValue(val, options)
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
function inferUniqueArray(values: any[], discriminatorKey?: string, options?: InferOptions): Map<string, z.ZodType> {
  const uniqueSchemas = new Map<string, z.ZodType>()

  for (const item of values) {
    const schema = inferFromValue(item, options)
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
 * Gets a score for a potential discriminator key based on its name and presence in the config
 *
 * @param key Candidate discriminator key
 * @param discriminators Optional list of preferred discriminator keys from the config
 *
 * @returns Score indicating how suitable the key is as a discriminator (higher is better)
 */
function getDiscriminatorNameScore(key: string, discriminators?: string[] | boolean): number {
  // Preferred discriminator names from config
  if (Array.isArray(discriminators) && discriminators.includes(key)) {
    return 100
  }

  // Fallback: common discriminator names (preferred if config.discriminators is true)
  if (!Array.isArray(discriminators) && discriminators && /^(?:type|kind|variant|tag|category|status)$/i.test(key)) {
    return 100
  }

  // Keys that end with "type" (e.g. "user_type", "event.type")
  if (/(?:^|_|\.)type$/i.test(key) || /kind|variant|tag|category|status/i.test(key)) {
    return 30
  }

  return 0
}

/**
 * Infers a Zod array schema from a given array of values
 *
 * @param value Array of values to infer the schema from
 *
 * @returns Array of inferred Zod schemas
 */
function inferArray(value: any[], options?: InferOptions): z.ZodArray {
  if (value.length === 0) {
    return z.array(z.any())
  }

  if (value.length === 1) {
    return z.array(inferFromValue(value[0]!, options))
  }

  const uniqueSchemas = inferUniqueArray(value, undefined, options)

  if (uniqueSchemas.size === 1) {
    return z.array(uniqueSchemas.values().next().value!)
  }

  const discriminatorCandidates = new Set<string>()

  for (const key of Object.keys(value[0]!)) {
    if (value.every(item => item && typeof item === 'object' && key in item && typeof item[key] === 'string' && item[key] !== '')) {
      discriminatorCandidates.add(key)
    }
  }

  if (discriminatorCandidates.size === 0) {
    return z.array(merge(Array.from(uniqueSchemas.values())))
  }

  const validDiscriminators: {
    key: string
    groupsCount: number
    repetitions: number
    schemas: [z.ZodObject<any>, ...z.ZodObject<any>[]]
    score: number
  }[] = []

  for (const discriminator of discriminatorCandidates) {
    const discriminatorNameScore = getDiscriminatorNameScore(discriminator, options?.discriminators)
    const allowUniquePreferredDiscriminator = discriminatorNameScore >= 100

    const groupedByDiscriminator = value.reduce((acc, item) => {
      const key = item[discriminator]

      if (!acc[key]) {
        acc[key] = []
      }

      acc[key].push(item)

      return acc
    }, {} as Record<string, any[]>)

    const groups = Object.entries(groupedByDiscriminator) as [string, any[]][]

    if (groups.length < 2) {
      continue
    }

    // Ignore identity-like keys where every item gets its own variant,
    // except for preferred discriminator names (type/kind/...) in small arrays.
    if (groups.length === value.length && !(allowUniquePreferredDiscriminator && groups.length <= 10)) {
      continue
    }

    const discriminatedSchemas: z.ZodObject<any>[] = []
    let canDiscriminate = true

    for (const [discValue, items] of groups) {
      const groupItemSchemas = items.map((item: any) => inferFromValue(item, options))

      if (!groupItemSchemas.every((s: z.ZodType) => s instanceof z.ZodObject)) {
        canDiscriminate = false
        break
      }

      const merged = groupItemSchemas.length === 1
        ? groupItemSchemas[0]!
        : merge(groupItemSchemas)

      if (!(merged instanceof z.ZodObject)) {
        canDiscriminate = false
        break
      }

      merged.shape[discriminator] = z.literal(discValue)
      discriminatedSchemas.push(merged)
    }

    if (canDiscriminate && discriminatedSchemas.length >= 2) {
      const repetitions = value.length - groups.length
      const score = discriminatorNameScore + (repetitions * 10) - groups.length

      validDiscriminators.push({
        key: discriminator,
        groupsCount: groups.length,
        repetitions,
        schemas: discriminatedSchemas as [z.ZodObject<any>, ...z.ZodObject<any>[]],
        score,
      })
    }
  }

  if (validDiscriminators.length > 0) {
    validDiscriminators.sort((a, b) => {
      if (b.score !== a.score)
        return b.score - a.score
      if (b.repetitions !== a.repetitions)
        return b.repetitions - a.repetitions
      return a.groupsCount - b.groupsCount
    })

    const best = validDiscriminators[0]!
    return z.array(z.discriminatedUnion(best.key, best.schemas))
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
function inferFromValue(value: any, options?: InferOptions): z.ZodType {
  if (value === null) {
    return z.null()
  }

  if (Array.isArray(value)) {
    return inferArray(value, options)
  }

  if (typeof value === 'object') {
    return inferObject(value, options)
  }

  if (typeof value === 'string')
    return z.string()
  if (typeof value === 'number')
    return z.number()
  if (typeof value === 'boolean')
    return z.boolean()

  return z.unknown()
}

/**
 * Create runtime Zod schemas from probe results
 *
 * @param probeResults Results from probing endpoints
 * @param config Parsed discovery configuration
 *
 * @returns Array of schema results
 */
export async function parseSchemas(probeResults: ProbeResult[], config: ParsedDiscoverConfig) {
  const getBodySchema = (config: ProbeConfig) => {
    if (!config.body) {
      return undefined
    }

    return inferFromValue(config.body)
  }

  const schemas: SchemaResult[] = []

  for (const result of probeResults) {
    try {
      const method = result.method
      const path = result.path
      const schemaConfig = result.config
      const samples = result.samples
      const inferOptions: InferOptions = {
        discriminators: schemaConfig.discriminators,
      }

      await config.hooks.callHook('zod:runtime:generate', config, method, path, schemaConfig, samples)

      const inferredSchemas = result.samples.map(sample => inferFromValue(JSON.parse(sample), inferOptions))
      const schema = merge(inferredSchemas)

      schemas.push({
        method,
        path,
        config: schemaConfig,
        schema,
        bodySchema: getBodySchema(schemaConfig),
      })
    }
    catch (error) {
      config.logger.error(`Failed to generate runtime Zod schema for "${result.method} ${result.path}"`)
      config.logger.debug(error)
    }
  }

  await config.hooks.callHook('zod:runtime:generated', config, schemas)

  return schemas
}
