import { z } from 'zod'

/**
 * HTTP methods supported for API probes
 */
export const httpMethodSchema = z.enum([
  'get',
  'put',
  'post',
  'patch',
  'delete',
])

/**
 * HTTP headers schema
 */
export const httpHeadersSchema = z.record(z.string(), z.string())

/**
 * Schema for a specific probe endpoint configuration
 */
export const probeConfigSchema = z.object({
  params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  query: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  headers: httpHeadersSchema.optional(),
  body: z.any().optional(),
})

/**
 * Schema for the main discover configuration
 */
export const discoverConfigSchema = z.object({
  outputDir: z.string().optional(),
  baseUrl: z.string().optional(),
  headers: httpHeadersSchema.optional(),
  probes: z.record(httpMethodSchema, z.union([probeConfigSchema, z.array(probeConfigSchema)]).or(z.boolean().default(true))),
  clear: z.boolean().optional(),
  minify: z.boolean().optional(),
  logger: z.any().optional(),
})

/**
 * Schema for discovery configuration with defaults applied
 */
export const discoverConfigSchemaWithDefaults = discoverConfigSchema.omit({
  outputDir: true,
  probes: true,
  clear: true,
  minify: true,
}).extend({
  probes: z.partialRecord(httpMethodSchema, discoverConfigSchema.shape.probes.transform((probes) => {
    const normalized = {} as Record<string, z.infer<typeof probeConfigSchema>[]>
    for (const [key, value] of Object.entries(probes)) {
      if (Array.isArray(value)) {
        normalized[key] = value.map(v => probeConfigSchema.parse(v))
      }
      else {
        if (value === true) {
          probeConfigSchema.parse({})
        }
        else {
          normalized[key] = [probeConfigSchema.parse(value)]
        }
      }
    }
    return normalized
  })),
  outputDir: discoverConfigSchema.shape.outputDir.default('./.autodisco'),
  clear: discoverConfigSchema.shape.clear.default(true),
  minify: discoverConfigSchema.shape.minify.default(false),
})

/**
 * HTTP methods supported for API probes
 */
export type HttpMethod = z.infer<typeof httpMethodSchema>

/**
 * HTTP headers type
 */
export type HttpHeaders = z.infer<typeof httpHeadersSchema>

/**
 * Endpoint probe configuration
 */
export type ProbeConfig = z.infer<typeof probeConfigSchema>

/**
 * Discovery configuration
 */
export type DiscoverConfig = z.infer<typeof discoverConfigSchema>

/**
 * Parsed discovery configuration with defaults applied
 */
export type ParsedDiscoverConfig = z.infer<typeof discoverConfigSchemaWithDefaults>
