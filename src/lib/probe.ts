import type { ParsedDiscoverConfig, ParsedProbeConfig } from './config.ts'

import { joinURL, withQuery } from 'ufo'

export type ProbeOptions = ParsedDiscoverConfig

export async function probe(endpoint: string, config: ParsedProbeConfig, baseUrl?: string) {
  const path = endpoint.replaceAll(/:([a-z]+)/gi, (_, key) => {
    const value = config.params?.[key]

    if (value === undefined) {
      throw new Error(`Missing parameter ${key} for endpoint ${endpoint}`)
    }

    return encodeURIComponent(String(value))
  })

  const response = await fetch(joinURL(baseUrl ?? '', config.query ? withQuery(path, config.query) : path), {
    method: config.method,
    ...(config.body ? { body: config.body } : {}),
    ...(config.headers ? { headers: config.headers } : {}),
  })

  if (!response.ok) {
    throw new Error(`Error probing ${endpoint}: ${response.statusText}`)
  }

  return response.text()
}

export async function probeEndpoints(options: ProbeOptions): Promise<Record<string, string[]>> {
  const results: Record<string, string[]> = {}

  for (const [endpoint, probeConfigs] of Object.entries(options.probes)) {
    const probes = []

    for (const probeConfig of probeConfigs) {
      probes.push(probe(endpoint, {
        ...(options.headers ? { headers: options.headers } : {}),
        ...probeConfig,
      }, options.baseUrl))
    }

    const samples = await Promise.all(probes)

    results[endpoint] = samples
  }

  return results
}
