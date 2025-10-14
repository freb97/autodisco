import type { ParsedDiscoverConfig } from '../config.ts'

import { writeFile } from 'node:fs/promises'
import {
  InputData,
  jsonInputForTargetLanguage,
  quicktype,
} from 'quicktype-core'
import { joinURL, normalizeURL, withoutTrailingSlash } from 'ufo'
import { z } from 'zod'

type GenerateZodOptions = ParsedDiscoverConfig & {
  typeName?: string
}

export async function generateZodFromJsonSamples(
  jsonSamples: string[],
  options: GenerateZodOptions,
) {
  const { typeName = 'GeneratedType' } = options

  try {
    const parsedSamples = jsonSamples.map((sample, index) => {
      try {
        return JSON.parse(sample)
      }
      catch (error) {
        throw new TypeError(`Invalid JSON in sample ${index + 1}: ${error instanceof Error ? error.message : String(error)}`)
      }
    })

    const inputData = new InputData()

    const jsonInput = jsonInputForTargetLanguage('typescript-zod')

    await jsonInput.addSource({
      name: typeName,
      samples: parsedSamples.map(s => JSON.stringify(s)),
    })

    inputData.addInput(jsonInput)

    const result = await quicktype({
      inputData,
      lang: 'typescript-zod',
      rendererOptions: {
        'just-types': 'true',
        'prefer-unions': 'true',
        'prefer-const-values': 'false',
      },
    })

    const zodCode = result.lines.join(options.minify ? '' : '\n')

    await writeFile(joinURL(options.outputDir, 'zod', `${typeName}.ts`), zodCode)

    const runtimeSchema = createRuntimeSchemaFromSamples(parsedSamples)

    return { code: zodCode, schema: runtimeSchema }
  }
  catch (error) {
    throw new Error(`Failed to generate Zod schema from samples: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Creates a Zod schema from JSON samples at runtime
 */
function createRuntimeSchemaFromSamples(samples: any[]): z.ZodType {
  if (samples.length === 0) {
    return z.any()
  }

  // Using the first sample to infer the schema structure
  // TODO: Refine by merging all samples to create a more comprehensive schema
  const firstSample = samples[0]
  return inferZodSchemaFromValue(firstSample)
}

/**
 * Recursively infers a Zod schema from a value
 */
function inferZodSchemaFromValue(value: any): z.ZodType {
  if (value === null) {
    return z.null()
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return z.array(z.any())
    }
    return z.array(inferZodSchemaFromValue(value[0]))
  }

  if (typeof value === 'object') {
    const shape: Record<string, any> = {}
    for (const [key, val] of Object.entries(value)) {
      shape[key] = inferZodSchemaFromValue(val)
    }
    return z.object(shape)
  }

  if (typeof value === 'string')
    return z.string()
  if (typeof value === 'number')
    return z.number()
  if (typeof value === 'boolean')
    return z.boolean()

  return z.any()
}

export async function generateZodSchemas(probeResults: Record<string, string[]>, options: GenerateZodOptions) {
  const schemas: Record<string, z.ZodType> = {}

  for (const [endpoint, samples] of Object.entries(probeResults)) {
    const path = withoutTrailingSlash(normalizeURL(endpoint.replaceAll(/:([a-z]+)/gi, '')))

    const result = await generateZodFromJsonSamples(samples, {
      typeName: path,
      ...options,
    })

    schemas[endpoint] = result.schema
  }

  return schemas
}
