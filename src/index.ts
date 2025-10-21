import type { DiscoverConfig } from './lib/config'

import { discoverConfigSchemaWithDefaults } from './lib/config'
import { generateOpenApiSchema } from './lib/generate/openapi'
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
 *     },
 *     post: {
 *       '/todos': { body: { title: 'New Todo', completed: false } },
 *     },
 *   },
 * })
 * ```
 */
export default async function discover(config: DiscoverConfig) {
  const startTime = performance.now()

  const parsedConfig = discoverConfigSchemaWithDefaults.parse(config)

  const probeResults = await prepare(parsedConfig)
    .then(() => probeEndpoints(parsedConfig))

  const configsParsedTime = performance.now()

  await generateZodSchemas(probeResults, parsedConfig)
    .then(schemaResults => generateOpenApiSchema(schemaResults, parsedConfig))

  parsedConfig.logger.success(`Discovery completed in ${Math.ceil(performance.now() - startTime)} ms (probing took ${Math.ceil(configsParsedTime - startTime)} ms)`)
}

export type { DiscoverConfig, ProbeConfig } from './lib/config'
