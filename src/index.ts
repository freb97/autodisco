import type { DiscoverConfig } from './lib/config'

import { discoverConfigSchemaWithDefaults } from './lib/config'
import { generateOpenApiSchema } from './lib/generate/openapi'
import { generateTypeScriptTypes } from './lib/generate/typescript'
import { generateZodSchemas } from './lib/generate/zod'
import { probeEndpoints } from './lib/probe'
import { prepare } from './lib/setup'

/**
 * Run the API discovery process
 *
 * @param config Discovery configuration
 *
 * @example
 * ```ts
 * import discover from 'autodisco'
 *
 * await discover({
 *   baseUrl: 'https://api.example.com',
 *   probes: {
 *     get: {
 *       '/todos': {},
 *       '/users/{id}': { params: { id: 1 } },
 *       '/posts': { query: { limit: 10 } },
 *     },
 *     post: {
 *       '/todos': { body: { title: 'New Todo', completed: false } },
 *     },
 *   },
 * })
 * ```
 *
 * Will call the endpoints
 *  - GET https://api.example.com/todos
 *  - GET https://api.example.com/users/1
 *  - GET https://api.example.com/posts?limit=10
 *  - POST https://api.example.com/todos
 *
 * and generate `${outputDir}/openapi/schema.json` with the discovered OpenAPI schema.
 */
export default async function discover(config: DiscoverConfig) {
  const startTime = performance.now()

  const parsedConfig = discoverConfigSchemaWithDefaults.parse(config)

  await parsedConfig.hooks.callHook('discovery:start', parsedConfig)

  const probeResults = await prepare(parsedConfig).then(() => probeEndpoints(parsedConfig))

  const probingCompletedTime = performance.now()

  await parsedConfig.hooks.callHook('probes:completed', parsedConfig, probeResults)

  const schemaResults = await generateZodSchemas(probeResults, parsedConfig)

  await parsedConfig.hooks.callHook('zod:runtime:generated', parsedConfig, schemaResults)

  const openapiResult = await generateOpenApiSchema(schemaResults, parsedConfig)

  await parsedConfig.hooks.callHook('openapi:generated', parsedConfig, openapiResult)

  await generateTypeScriptTypes(openapiResult, parsedConfig)

  const totalTime = Math.ceil(performance.now() - startTime)
  const totalProbingTime = Math.ceil(probingCompletedTime - startTime)

  await parsedConfig.hooks.callHook('discovery:completed', parsedConfig, totalTime, totalProbingTime)

  parsedConfig.logger.success(`Discovery completed in ${totalTime} ms (probing took ${totalProbingTime} ms)`)
}

export type { DiscoverConfig, ProbeConfig } from './lib/config'
