import { z } from 'zod'

/**
 * HTTP methods supported for API probes
 */
export const httpMethodSchema = z.enum([
  'GET',
  'PUT',
  'POST',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
  'TRACE',
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
  method: httpMethodSchema.optional(),
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
  probes: z.record(z.string(), z.union([probeConfigSchema, z.array(probeConfigSchema)])),
  clear: z.boolean().optional(),
  minify: z.boolean().optional(),
  logger: z.any().optional(),
})

/**
 * Schema for probe configuration with defaults applied
 */
export const probeConfigSchemaWithDefaults = probeConfigSchema.omit({
  method: true,
}).extend({
  method: probeConfigSchema.shape.method.default('GET'),
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
  probes: z.record(z.string(), z.array(probeConfigSchemaWithDefaults)),
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
 * Parsed endpoint probe configuration with defaults applied
 */
export type ParsedProbeConfig = z.infer<typeof probeConfigSchemaWithDefaults>

/**
 * Parsed discovery configuration with defaults applied
 */
export type ParsedDiscoverConfig = z.infer<typeof discoverConfigSchemaWithDefaults>
