import type { ProbeResult } from '../types'
import type { HttpMethod, ParsedDiscoverConfig, ProbeConfig } from './config'

import { defu } from 'defu'
import { joinURL } from 'ufo'

import { resolvePath } from '../helpers/path'

/**
 * Serialize a configured request body.
 *
 * @param body Configured request body
 * @param headers Configured request headers
 *
 * @returns The serialized body and the headers to send it with
 */
function serializeBody(body: unknown, headers: Record<string, string> = {}) {
  if (body === undefined || body === null) {
    return { body: undefined, headers }
  }

  if (
    typeof body === 'string'
    || body instanceof FormData
    || body instanceof URLSearchParams
    || body instanceof Blob
    || body instanceof ArrayBuffer
    || body instanceof ReadableStream
  ) {
    return { body, headers }
  }

  if (ArrayBuffer.isView(body)) {
    return { body: body as Uint8Array, headers }
  }

  const hasContentType = Object.keys(headers).some(header => header.toLowerCase() === 'content-type')

  return {
    body: JSON.stringify(body),
    headers: hasContentType ? headers : { ...headers, 'Content-Type': 'application/json' },
  }
}

/**
 * Create probes for all endpoints defined in the configuration
 *
 * @param config Parsed discovery configuration
 *
 * @returns Array of promises for probe results
 */
function createProbes(config: ParsedDiscoverConfig) {
  async function create(method: HttpMethod, path: string, probeConfigs: (ProbeConfig & { baseUrl?: string })[]) {
    const results: ProbeResult[] = []

    for (const probeConfig of probeConfigs) {
      const parsedProbeConfig = {
        baseUrl: config.baseUrl,

        ...probeConfig,

        headers: {
          ...config.headers,
          ...probeConfig.headers,
        },
      }

      await config.hooks.callHook('probe:request', method, path, parsedProbeConfig)

      const { body, headers } = serializeBody(parsedProbeConfig.body, parsedProbeConfig.headers)

      const response = await fetch(joinURL(parsedProbeConfig.baseUrl ?? '', resolvePath(path, parsedProbeConfig)), {
        method,
        ...(body !== undefined ? { body } : {}),
        ...(Object.keys(headers).length > 0 ? { headers } : {}),
      }).then(async (response) => {
        if (!response.ok) {
          config.logger.error(
            `Received error response fetching "${method} ${path}": ${response.status} ${response.statusText}`,
          )

          return ''
        }

        config.logger.debug(
          `Received success response fetching "${method} ${path}": ${response.statusText}`,
        )

        return response.text()
      }).catch((error) => {
        config.logger.error(`Network error fetching "${method} ${path}"`)
        config.logger.debug(error)
        return ''
      })

      await config.hooks.callHook('probe:response', method, path, parsedProbeConfig, response)

      results.push({
        method,
        path,
        config: probeConfig,
        samples: [response],
      })
    }

    return {
      method,
      path,
      results: results.filter(result => result.samples.some(sample => sample.length > 0)),
    }
  }

  const probes: Promise<{ method: HttpMethod, path: string, results: ProbeResult[] }>[] = []

  for (const [method, endpoints] of Object.entries(config.probes)) {
    for (const [path, probeConfigs] of Object.entries(endpoints)) {
      probes.push(create(method as HttpMethod, path, probeConfigs))
    }
  }

  return probes
}

/**
 * Probe all endpoints defined in the configuration
 *
 * @param config Parsed discovery configuration
 *
 * @returns Array of probe results
 */
export async function probeEndpoints(config: ParsedDiscoverConfig) {
  const probes = createProbes(config)

  return Promise.all(probes).then(probeResults => probeResults.flatMap(({ method, path, results }) => {
    if (results.length === 0) {
      config.logger.error(`Did not receive any valid probe responses for "${method} ${path}"`)

      return []
    }

    return {
      method,
      path,
      config: results.reduce((acc, curr) => defu(curr.config, acc), {} as ProbeConfig),
      samples: results.flatMap(result => result.samples.filter(sample => sample.length > 0)),
    }
  }))
}
