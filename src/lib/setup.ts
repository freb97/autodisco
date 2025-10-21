import type { ParsedDiscoverConfig } from './config'

import { mkdir, rm, stat } from 'node:fs/promises'
import { joinURL } from 'ufo'

/**
 * Prepare the output directory based on the configuration
 *
 * @param config Parsed discovery configuration
 */
export async function prepare(config: ParsedDiscoverConfig) {
  if (config.clear) {
    await stat(config.outputDir)
      .then(async () => rm(config.outputDir, { recursive: true }))
      .catch(() => {})
  }

  await mkdir(config.outputDir, { recursive: true })

  await mkdir(joinURL(config.outputDir, 'openapi'), { recursive: true })

  if (config.generate?.zod) {
    await mkdir(joinURL(config.outputDir, 'zod'), { recursive: true })
  }
}
