import type { ParsedDiscoverConfig, ProbeConfig, ProbeResult, SchemaResult } from '../config'

import { mkdir, writeFile } from 'node:fs/promises'
import defu from 'defu'
import { joinURL } from 'ufo'
import { z } from 'zod'

import { resolveTypeName } from '../../helpers/path'
import { inferZodSchemaFromValue } from '../../helpers/schema'

/**
 * Merge multiple JSON samples into a single JSON object
 *
 * @param samples JSON samples to merge
 *
 * @returns Merged JSON object
 */
function mergeSamples(samples: string[]) {
  const base = JSON.parse(samples?.[0] ?? '{}')

  return samples.slice(1).reduce((acc, sample) => {
    const value = JSON.parse(sample)

    if (Array.isArray(value) && Array.isArray(acc)) {
      return acc.concat(value)
    }
    else if (typeof value === 'object' && typeof acc === 'object') {
      return defu(value, acc)
    }
    else {
      throw new TypeError('Incompatible sample types for merging')
    }
  }, base)
}

/**
 * Create Zod schemas from probe results using Quicktype
 *
 * @param probeResults Results from probing endpoints
 * @param config Parsed discovery configuration
 *
 * @returns Array of promises for schema generation
 */
async function createSchemas(probeResults: ProbeResult[], config: ParsedDiscoverConfig) {
  return import('quicktype-core').then(async (quickType) => {
    const groupedResults = new Map<string, ProbeResult[]>()

    // Group probe results by method and name
    for (const probeResult of probeResults) {
      const name = resolveTypeName(probeResult.path)
      const key = `${probeResult.method}:${name}`

      if (!groupedResults.has(key)) {
        groupedResults.set(key, [])
      }

      groupedResults.get(key)?.push(probeResult)
    }

    // Convert Map values to array
    return Promise.all(Array.from(groupedResults.values()).map(async (group) => {
      const name = resolveTypeName(group[0]!.path)
      const method = group[0]!.method

      const inputData = new quickType.InputData()

      const jsonInput = quickType.jsonInputForTargetLanguage('typescript-zod')

      await jsonInput.addSource({
        name,
        samples: group.flatMap(result => result.samples),
      })

      inputData.addInput(jsonInput)

      const rendererOptions = typeof config.generate?.zod === 'object' ? config.generate.zod : {}

      await config.hooks.callHook('zod:generate', method, name, inputData, rendererOptions)

      try {
        const result = await quickType.quicktype({
          inputData,
          lang: 'typescript-zod',
          rendererOptions,
        })

        await mkdir(joinURL(config.outputDir, 'zod', method), { recursive: true })
          .then(() => writeFile(
            joinURL(config.outputDir, 'zod', method, `${name}.ts`),
            result.lines.join(config.minify ? '' : '\n'),
          ))
      }
      catch (error) {
        config.logger.error(`Failed to generate Zod schema for ${method} ${group[0]!.path}`)
        config.logger.debug(error)
      }
    }))
  }).then(async () => await config.hooks.callHook('zod:generated', config)).catch((error) => {
    throw new Error('quicktype-core is required to generate Zod schemas.\nYou can install it with: npm install quicktype-core', { cause: error })
  })
}

/**
 * Create runtime Zod schemas from probe results
 *
 * @param probeResults Results from probing endpoints
 * @param config Parsed discovery configuration
 *
 * @returns Array of schema results
 */
async function createRuntimeSchemas(probeResults: ProbeResult[], config: ParsedDiscoverConfig) {
  const getBodySchema = (config: ProbeConfig) => {
    if (!config.body) {
      return undefined
    }

    const schema = inferZodSchemaFromValue(config.body)

    return schema instanceof z.ZodObject ? schema.partial() : schema
  }

  const schemas: SchemaResult[] = []

  for (const result of probeResults) {
    try {
      const method = result.method
      const path = result.path
      const schemaConfig = result.config
      const sample = mergeSamples(result.samples)

      await config.hooks.callHook('zod:runtime:generate', method, path, schemaConfig, sample)

      schemas.push({
        method,
        path,
        config: schemaConfig,
        schema: inferZodSchemaFromValue(sample),
        bodySchema: getBodySchema(schemaConfig),
      })
    }
    catch (error) {
      config.logger.error(`Failed to generate runtime Zod schema for "${result.method} ${result.path}"`)
      config.logger.debug(error)
    }
  }

  return schemas
}

/**
 * Run Zod schema generation from probe results
 *
 * @param probeResults Results from probing endpoints
 * @param config Parsed discovery configuration
 *
 * @returns Array of schema results
 */
export async function generateZodSchemas(probeResults: ProbeResult[], config: ParsedDiscoverConfig) {
  if (config.generate?.zod) {
    await createSchemas(probeResults, config)
  }

  return createRuntimeSchemas(probeResults, config)
}
