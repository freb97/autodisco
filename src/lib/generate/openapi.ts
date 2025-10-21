import type { ZodOpenApiComponentsObject, ZodOpenApiPathsObject } from 'zod-openapi'

import type { ParsedDiscoverConfig } from '../config'

import type { SchemaResult } from './zod'
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

  components.responses = {}

  for (const schemaResult of schemaResults) {
    const name = resolveTypeName(schemaResult.path)

    components.responses[name] = {
      description: '200 OK',
      content: {
        'application/json': {
          schema: schemaResult.schema,
        },
      },
    }
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
        requestParams: {
          ...(params ? { path: params } : {}),
          ...(query ? { query } : {}),
          ...(headers ? { headers } : {}),
        },
        responses: {
          200: {
            description: '200 OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    jobId: {
                      $ref: `#/components/responses/${name}`,
                    },
                    title: {
                      type: 'string',
                      description: 'Job title',
                      example: 'My job',
                    },
                  },
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

  await writeFile(joinURL(config.outputDir, 'openapi/schema.json'), JSON.stringify(document, undefined, config.minify ? 0 : 2))
}
