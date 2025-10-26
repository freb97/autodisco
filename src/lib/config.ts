import { createConsola } from 'consola'
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
  probes: z.partialRecord(
    httpMethodSchema,
    z.record(z.string(), z.union([probeConfigSchema, z.array(probeConfigSchema)])),
  ),
  generate: z.object({
    zod: z.union([z.boolean(), z.object<import('quicktype-core').RendererOptions<'typescript-zod'>>()]).optional(),
    typescript: z.union([z.boolean(), z.object<import('openapi-typescript').OpenAPITSOptions>()]).optional(),
  }).optional(),
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
  generate: true,
  clear: true,
  logger: true,
}).extend({
  outputDir: discoverConfigSchema.shape.outputDir.default('.autodisco'),
  probes: discoverConfigSchema.shape.probes.transform((probes) => {
    const transformed: Record<string, Record<string, ProbeConfig[]>> = {}

    for (const [method, endpoints] of Object.entries(probes)) {
      transformed[method] = {}

      for (const [endpoint, config] of Object.entries(endpoints)) {
        if (Array.isArray(config)) {
          transformed[method][endpoint] = config
        }
        else {
          transformed[method][endpoint] = [config]
        }
      }
    }

    return transformed
  }),
  generate: discoverConfigSchema.shape.generate.transform((generate) => {
    return {
      zod: typeof generate?.zod === 'object'
        ? generate.zod as import('quicktype-core').RendererOptions<'typescript-zod'>
        : generate?.zod ?? false,
      typescript: typeof generate?.typescript === 'object'
        ? generate.typescript as import('openapi-typescript').OpenAPITSOptions
        : generate?.typescript ?? false,
    }
  }),
  clear: discoverConfigSchema.shape.clear.default(true),
  logger: discoverConfigSchema.shape.logger.transform(logger => createConsola(logger)),
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
