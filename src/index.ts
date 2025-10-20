import type { DiscoverConfig } from './lib/config'

import { useLogger } from './helpers/logger'
import { discoverConfigSchemaWithDefaults } from './lib/config'
import { generateOpenApiSchema } from './lib/generate/openapi'
import { generateZodSchemas } from './lib/generate/zod'
import { probeEndpoints } from './lib/probe'
import { prepare } from './lib/setup'

export default async function discover(config: DiscoverConfig) {
  const start = performance.now()

  const parsedConfig = discoverConfigSchemaWithDefaults.parse(config)

  const logger = useLogger(config.logger)

  await prepare(parsedConfig)
    .then(() => probeEndpoints(parsedConfig)
      .then(probeResults => generateZodSchemas(probeResults, parsedConfig)
        .then(schemas => generateOpenApiSchema(schemas, parsedConfig))))

  logger.withTag('autodisco').success(`Discovery completed in ${Math.ceil(performance.now() - start)} ms`)
}

export type { DiscoverConfig, ProbeConfig } from './lib/config'
