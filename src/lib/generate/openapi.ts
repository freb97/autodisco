import type { ZodOpenApiPathsObject } from 'zod-openapi'

import type { ParsedDiscoverConfig } from '../config'

import { writeFile } from 'node:fs/promises'

import { joinURL } from 'ufo'
import { z } from 'zod'
import { createDocument } from 'zod-openapi'

export type GenerateOpenApiOptions = ParsedDiscoverConfig

export function getParams(params?: Record<string, string | number | boolean>, optional = false) {
  const parsedParams = Object.entries(params || {}).reduce((acc, [key, value]) => {
    const o = (v: z.ZodType) => optional ? v.optional() : v
    acc[key] = typeof value === 'string' ? o(z.string()) : typeof value === 'number' ? o(z.number()) : o(z.boolean())
    return acc
  }, {} as Record<string, z.ZodType>)

  return Object.keys(parsedParams).length ? z.object(parsedParams) : undefined
}

export async function generateOpenApiSchema(
  schemas: Record<string, z.ZodType>,
  options: GenerateOpenApiOptions,
) {
  const paths: ZodOpenApiPathsObject = {}

  for (const [endpoint, probeConfigs] of Object.entries(options.probes)) {
    const configArray = Array.isArray(probeConfigs) ? probeConfigs : [probeConfigs]

    const schema = schemas[endpoint] || z.any()

    for (const probeConfig of configArray) {
      const method = probeConfig.method

      const params = getParams(probeConfig.params)
      const query = getParams(probeConfig.query, true)
      const headers = getParams({ ...options.headers, ...probeConfig.headers }, true)

      // Convert :param to {param} for OpenAPI format
      const openApiPath = endpoint.replaceAll(/:\w+/g, match => `{${match.slice(1)}}`)

      paths[openApiPath] = {
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
                  schema,
                },
              },
            },
          },
        },
      }
    }
  }

  const document = createDocument({
    openapi: '3.1.0',
    info: {
      version: '1.0.0',
      title: 'AutoDisco',
      description: 'Automatically generated API schema from discovered endpoints',
    },
    ...(options.baseUrl
      ? {
          servers: [
            {
              url: options.baseUrl,
              description: 'API Server',
            },
          ],
        }
      : {}),
    paths,
  })

  await writeFile(joinURL(options.outputDir, 'openapi/schema.json'), JSON.stringify(document, undefined, options.minify ? 0 : 2))
}
