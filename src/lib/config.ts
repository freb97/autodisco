import type { ConsolaOptions } from 'consola'

import type { DiscoverHooks } from '../types'

import { createConsola } from 'consola'
import { Hookable } from 'hookable'
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
    openapi: z.object({
      typescript: z.union([z.boolean(), z.object<import('openapi-typescript').OpenAPITSOptions>()]).optional(),
    }).or(z.boolean()).optional(),
    json: z.boolean().optional(),
    zod: z.boolean().optional(),
    markdown: z.boolean().optional(),
    typescript: z.boolean().optional(),
  }).optional(),
  clear: z.boolean().optional(),
  minify: z.boolean().optional(),
  logger: z.any().transform(v => v as Partial<ConsolaOptions>).optional(),
  hooks: z.any().transform(v => v as Partial<DiscoverHooks>).optional(),
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
  hooks: true,
}).extend({
  outputDir: discoverConfigSchema.shape.outputDir.default('autodisco'),
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
      openapi: typeof generate?.openapi === 'object' && typeof generate?.openapi?.typescript === 'object'
        ? { typescript: generate.openapi.typescript as import('openapi-typescript').OpenAPITSOptions }
        : generate?.openapi ?? false,
      json: generate?.json ?? false,
      zod: generate?.zod ?? false,
      markdown: generate?.markdown ?? false,
      typescript: generate?.typescript ?? false,
    }
  }),
  clear: discoverConfigSchema.shape.clear.default(true),
  logger: discoverConfigSchema.shape.logger.transform(logger => createConsola(logger)),
  hooks: discoverConfigSchema.shape.hooks.transform((hooks) => {
    const hookable = new Hookable<DiscoverHooks>()
    if (hooks) {
      for (const [hookName, hookFn] of Object.entries(hooks)) {
        hookable.hook(hookName as keyof typeof hooks, hookFn)
      }
    }
    return hookable
  }),
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
