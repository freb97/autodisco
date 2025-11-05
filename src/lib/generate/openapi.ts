import type { ZodOpenApiComponentsObject, ZodOpenApiPathsObject } from 'zod-openapi'

import type { ParsedDiscoverConfig, SchemaResult } from '../config'

import { writeFile } from 'node:fs/promises'
import { joinURL } from 'ufo'
import { z } from 'zod'
import { createDocument } from 'zod-openapi'

import { resolveTypeName } from '../../helpers/path'

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
function getComponents(schemaResults: SchemaResult[]) {
  const components: ZodOpenApiComponentsObject = {}

  components.schemas = {}

  for (const schemaResult of schemaResults) {
    const name = resolveTypeName(schemaResult.path)

    components.schemas[name] = schemaResult.schema
  }

  return components
}

function getPaths(schemaResults: SchemaResult[], config: ParsedDiscoverConfig) {
  const paths: ZodOpenApiPathsObject = {}

  for (const schemaResult of schemaResults) {
    const method = schemaResult.method

    const name = resolveTypeName(schemaResult.path)

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
                  schema: schemaResult.bodySchema,
                },
              },
            } }
          : {}),

        responses: {
          200: {
            description: '200 OK',
            content: {
              'application/json': {
                schema: {
                  $ref: `#/components/schemas/${name}`,
                },
              },
            },
          },
        },
      },
    }
  }

  return paths
}

/**
 * Generate OpenAPI schema from Zod schema results
 *
 * @param schemaResults Array of schema results
 * @param config Parsed discovery configuration
 */
export async function generateOpenApiSchema(schemaResults: SchemaResult[], config: ParsedDiscoverConfig) {
  const components: ZodOpenApiComponentsObject = getComponents(schemaResults)
  const paths: ZodOpenApiPathsObject = getPaths(schemaResults, config)

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

  const jsonDocument = JSON.stringify(document, undefined, config.minify ? 0 : 2)

  await writeFile(joinURL(config.outputDir, 'openapi/schema.json'), jsonDocument)

  return jsonDocument
}
