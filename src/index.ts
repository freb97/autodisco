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

  const probeResults = await prepare(parsedConfig)
    .then(() => probeEndpoints(parsedConfig))

  const probingCompletedTime = performance.now()

  await generateZodSchemas(probeResults, parsedConfig)
    .then(schemaResults => generateOpenApiSchema(schemaResults, parsedConfig)
      .then(openapiResult => generateTypeScriptTypes(openapiResult, parsedConfig)))

  const totalTime = Math.ceil(performance.now() - startTime)
  const totalProbingTime = Math.ceil(probingCompletedTime - startTime)

  parsedConfig.logger.success(`Discovery completed in ${totalTime} ms (probing took ${totalProbingTime} ms)`)
}

export type { DiscoverConfig, ProbeConfig } from './lib/config'
