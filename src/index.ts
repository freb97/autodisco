import type { DiscoverConfig } from './lib/config.ts'

import { createConsola } from 'consola'

import { discoverConfigSchemaWithDefaults } from './lib/config.ts'
import { generateOpenApiSchema } from './lib/generate/openapi.ts'
import { generateZodSchemas } from './lib/generate/zod.ts'
import { probeEndpoints } from './lib/probe.ts'
import { prepare } from './lib/setup.ts'

export default async function discover(config: DiscoverConfig) {
  const start = performance.now()

  const parsedConfig = discoverConfigSchemaWithDefaults.parse(config)

  const logger = createConsola(parsedConfig.logger)

  await prepare(parsedConfig)
    .then(() => probeEndpoints(parsedConfig)
      .then(probeResults => generateZodSchemas(probeResults, parsedConfig)
        .then(schemas => generateOpenApiSchema(schemas, parsedConfig))))

  logger.withTag('autodisco').success(`Discovery completed in ${Math.ceil(performance.now() - start)} ms`)
}

export type { DiscoverConfig, ProbeConfig } from './lib/config.ts'
