import type { ParsedDiscoverConfig, ProbeConfig } from './config'

import { joinURL, withQuery } from 'ufo'

import { useLogger } from '../helpers/logger'

export type ProbeOptions = ParsedDiscoverConfig

export type Probe

export async function probe(endpoint: string, config: ProbeConfig & {
  method: string
  baseUrl?: string
  logger?: ParsedDiscoverConfig['logger']
}) {
  const logger = useLogger(config.logger)

  const path = endpoint.replaceAll(/:([a-z]+)/gi, (_, key) => {
    const value = config.params?.[key]

    if (value === undefined) {
      logger.error(`Missing parameter ${key} for endpoint ${endpoint}`)
    }

    return encodeURIComponent(String(value))
  })

  const response = await fetch(joinURL(config.baseUrl ?? '', config.query ? withQuery(path, config.query) : path), {
    method: config.method,
    ...(config.body ? { body: config.body } : {}),
    ...(config.headers ? { headers: config.headers } : {}),
  })

  if (!response.ok) {
    logger.error(`Error probing ${endpoint}: ${response.statusText}`)
  }

  return {
    sample: response.text(),
    config,
  }
}

export async function probeEndpoints(options: ProbeOptions): Promise<Record<string, { samples: string[], config: ProbeConfig }>> {
  const results: Record<string, { samples: string[], config: ProbeConfig }> = {}

  for (const [method, probes] of Object.entries(options.probes)) {
    for (const [endpoint, probeConfigs] of Object.entries(probes)) {
      const probes = []

      if (!Array.isArray(probeConfigs)) {
        probes.push(probe(endpoint, {
          method,
          baseUrl: options.baseUrl,
          ...(options.headers ? { headers: options.headers } : {}),
        }))
      }
      else {
        for (const probeConfig of probeConfigs) {
          probes.push(probe(endpoint, {
            method,
            baseUrl: options.baseUrl,
            ...(options.headers ? { headers: options.headers } : {}),
            ...probeConfig,
          }))
        }
      }

      const samples = await Promise.all(probes)

      results[endpoint] = samples
    }
  }

  return results
}
