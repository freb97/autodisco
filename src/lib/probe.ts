import type { HttpMethod, ParsedDiscoverConfig, ProbeConfig } from './config'

import { defu } from 'defu'
import { joinURL } from 'ufo'

import { resolvePath } from '../helpers/path'

export interface ProbeResult {
  method: HttpMethod
  path: string
  config: ProbeConfig
  samples: string[]
}

/**
 * Create probes for all endpoints defined in the configuration
 *
 * @param config Parsed discovery configuration
 *
 * @returns Array of promises for probe results
 */
function createProbes(config: ParsedDiscoverConfig) {
  async function create(method: HttpMethod, path: string, probeConfigs: ProbeConfig[]) {
    const results: ProbeResult[] = []

    for (const probeConfig of probeConfigs) {
      const headers = { ...config.headers, ...probeConfig.headers }
      const body = probeConfig.body

      results.push({
        method,
        path,
        config: probeConfig,
        samples: [await fetch(joinURL(config.baseUrl ?? '', resolvePath(path, probeConfig)), {
          method,
          ...(body ? { body } : {}),
          ...(headers ? { headers } : {}),
        }).then(async (response) => {
          if (!response.ok) {
            config.logger.error(`Received error response fetching "${method} ${path}": ${response.statusText}`)
          }
          else {
            config.logger.debug(`Received success response fetching "${method} ${path}": ${response.statusText}`)
          }

          return response.text()
        }).catch((error) => {
          config.logger.error(`Network error fetching "${method} ${path}"`)
          config.logger.debug(error)
          return ''
        })],
      })
    }

    return results.filter(result => result.samples.length > 0 && result.samples.some(sample => sample.length > 0))
  }

  const probes: Promise<ProbeResult[]>[] = []

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

  return Promise.all(probes).then(results => results.flatMap(result => ({
    method: result[0].method,
    path: result[0].path,
    config: result.reduce((acc, curr) => defu(curr.config, acc), {} as ProbeConfig),
    samples: result.reduce((acc, curr) => acc.concat(curr.samples), [] as string[]),
  })))
}
