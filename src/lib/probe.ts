import type { HttpMethod, ParsedDiscoverConfig, ProbeConfig, ProbeResult } from './config'

import { defu } from 'defu'
import { joinURL } from 'ufo'

import { resolvePath } from '../helpers/path'

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

      const response = await fetch(joinURL(parsedProbeConfig.baseUrl ?? '', resolvePath(path, parsedProbeConfig)), {
        method,
        ...(parsedProbeConfig.body ? { body: parsedProbeConfig.body } : {}),
        ...(parsedProbeConfig.headers ? { headers: parsedProbeConfig.headers } : {}),
      }).then(async (response) => {
        if (!response.ok) {
          config.logger.error(
            `Received error response fetching "${method} ${path}": ${response.statusText}`,
          )
        }
        else {
          config.logger.debug(
            `Received success response fetching "${method} ${path}": ${response.statusText}`,
          )
        }

        return response.text()
      }).catch((error) => {
        config.logger.error(`Network error fetching "${method} ${path}"`)
        config.logger.debug(error)
        return ''
      })

      await config.hooks.callHook('probe:response', method, path, probeConfig, response)

      results.push({
        method,
        path,
        config: probeConfig,
        samples: [response],
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

  return Promise.all(probes).then(results => results.flatMap((result) => {
    if (result.length > 0) {
      return {
        method: result[0]!.method,
        path: result[0]!.path,
        config: result.reduce((acc, curr) => defu(curr.config, acc), {} as ProbeConfig),
        samples: result.reduce((acc, curr) => acc.concat(curr.samples), [] as string[]),
      }
    }
    else {
      config.logger.error('Did not receive any valid probe responses')
    }

    return []
  }))
}
