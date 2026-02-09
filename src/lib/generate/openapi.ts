import type { ZodOpenApiComponentsObject, ZodOpenApiPathsObject } from 'zod-openapi'

import type { SchemaResult } from '../../types'
import type { ParsedDiscoverConfig } from '../config'

import { mkdir, writeFile } from 'node:fs/promises'
import { joinURL } from 'ufo'
import { z } from 'zod'
import { createDocument } from 'zod-openapi'

import { resolveTypeName } from '../../helpers/path'

/**
 * Gets the name of the schema based on the HTTP method and path
 *
 * @param schemaResult Schema result to get the name from
 *
 * @returns Name of the schema in the format MethodPath, e.g. GetUsers, PostUsers, etc.
 */
function getName(schemaResult: SchemaResult, config: ParsedDiscoverConfig) {
  const method = String(schemaResult.method).charAt(0).toUpperCase() + schemaResult.method.slice(1).toLowerCase()
  const name = resolveTypeName(joinURL(config.baseUrl ?? '', schemaResult.path))

  return `${method}${name}`
}

/**
 * Get path parameters, query parameters, or headers as Zod schemas
 *
 * @param params Parameters to convert
 * @param optional Whether the parameters are optional
 *
 * @returns Zod schema for the given parameters
 */
function getParams(params?: Record<string, string | number | boolean>, optional = false) {
  const parsedParams = Object.entries(params || {}).reduce((acc, [key, value]) => {
    const o = (v: z.ZodType) => optional ? v.optional() : v
    acc[key] = typeof value === 'string' ? o(z.string()) : typeof value === 'number' ? o(z.number()) : o(z.boolean())
    return acc
  }, {} as Record<string, z.ZodType>)

  return Object.keys(parsedParams).length ? z.object(parsedParams) : undefined
}

/**
 * Get OpenAPI components from schema results
 *
 * @param schemaResults Array of schema results
 *
 * @returns OpenAPI components object
 */
function getComponents(schemaResults: SchemaResult[], config: ParsedDiscoverConfig) {
  const components: ZodOpenApiComponentsObject = {}

  for (const schemaResult of schemaResults) {
    const name = getName(schemaResult, config)

    components.schemas ??= {}
    components.schemas[name] = schemaResult.schema

    if (schemaResult.bodySchema) {
      components.schemas[`${name}RequestBody`] = schemaResult.bodySchema
    }

    components.responses ??= {}
    components.responses[`${name}Response`] = {
      description: '200 OK',
      content: {
        'application/json': {
          schema: {
            $ref: `#/components/schemas/${name}`,
          },
        },
      },
    }
  }

  return components
}

/**
 * Get OpenAPI paths from schema results and configuration
 *
 * @param schemaResults Array of schema results
 * @param config Parsed discovery configuration
 *
 * @returns OpenAPI paths object
 */
function getPaths(schemaResults: SchemaResult[], config: ParsedDiscoverConfig) {
  const paths: ZodOpenApiPathsObject = {}

  for (const schemaResult of schemaResults) {
    const method = schemaResult.method

    const name = getName(schemaResult, config)

    const params = getParams(schemaResult.config.params)
    const query = getParams(schemaResult.config.query, true)
    const headers = getParams({ ...config.headers, ...schemaResult.config.headers }, true)

    paths[schemaResult.path] = {
      [method.toLowerCase()]: {
        ...(params || query || headers
          ? { requestParams: {
              ...(params ? { path: params } : {}),
              ...(query ? { query } : {}),
              ...(headers ? { headers } : {}),
            } }
          : {}),

        ...(schemaResult.bodySchema
          ? { requestBody: {
              content: {
                'application/json': {
                  schema: {
                    $ref: `#/components/schemas/${name}RequestBody`,
                  },
                },
              },
            } }
          : {}),

        responses: {
          200: {
            $ref: `#/components/responses/${name}Response`,
          },
        },
      },
    }
  }

  return paths
}

/**
 * Generate TypeScript types from OpenAPI schema result
 *
 * @param openApiResult OpenAPI schema result as JSON string
 * @param config Parsed discovery configuration
 */
export async function generateOpenApiTypeScriptTypes(openApiResult: string | undefined, config: ParsedDiscoverConfig) {
  if (typeof config.generate.openapi !== 'object' || !config.generate.openapi.typescript || !openApiResult) {
    return
  }

  return import('openapi-typescript').then(async (openapiTS) => {
    let openapiTSOptions = {}

    if (typeof config.generate.openapi === 'object' && typeof config.generate.openapi.typescript === 'object') {
      openapiTSOptions = config.generate.openapi.typescript
    }

    await config.hooks.callHook('openapi:typescript:generate', config, openapiTSOptions)

    const ast = await openapiTS.default(openApiResult, openapiTSOptions)
    const result = openapiTS.astToString(ast)

    await config.hooks.callHook('openapi:typescript:generated', config, result)

    await writeFile(joinURL(config.outputDir, 'openapi', 'types.d.ts'), result)

    return result
  }).catch((error) => {
    throw new Error('openapi-typescript is required to generate TypeScript types.\nYou can install it with: npm install openapi-typescript', { cause: error })
  })
}

/**
 * Generate OpenAPI schema from Zod schema results
 *
 * @param schemaResults Array of schema results
 * @param config Parsed discovery configuration
 *
 * @return Generated OpenAPI schema as JSON string
 */
export async function generateOpenApiSchema(schemaResults: SchemaResult[], config: ParsedDiscoverConfig) {
  const noGenerateOptions = Object.values(config.generate).every(v => !v)

  if (!noGenerateOptions && !config.generate.openapi) {
    return
  }

  const components = getComponents(schemaResults, config)
  const paths = getPaths(schemaResults, config)

  await config.hooks.callHook('openapi:generate', config, components, paths)

  const document = createDocument({
    openapi: '3.1.1',
    info: {
      version: '1.0.0',
      title: 'AutoDisco',
      description: 'Automatically generated API schema from discovered endpoints',
    },
    ...(config.baseUrl
      ? {
          servers: [
            {
              url: config.baseUrl,
              description: 'API Server',
            },
          ],
        }
      : {}),
    components,
    paths,
  })

  const openApiDocument = JSON.stringify(document, undefined, config.minify ? 0 : 2)

  await mkdir(joinURL(config.outputDir, 'openapi'), { recursive: true })
    .then(() => writeFile(joinURL(config.outputDir, 'openapi', 'schema.json'), openApiDocument))

  await config.hooks.callHook('openapi:generated', config, openApiDocument)

  await generateOpenApiTypeScriptTypes(openApiDocument, config)

  return openApiDocument
}
