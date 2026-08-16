import type { ParsedDiscoverConfig } from './config'

import { mkdir, rm, stat } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import process from 'node:process'

/**
 * Prepare the output directory based on the configuration
 *
 * @param config Parsed discovery configuration
 */
export async function prepare(config: ParsedDiscoverConfig) {
  if (config.clear) {
    const outputDir = resolve(config.outputDir)
    const cwd = process.cwd()

    if (outputDir === cwd || cwd.startsWith(outputDir + sep)) {
      throw new Error(
        `Could not clear output directory "${config.outputDir}": Directory resolves to "${outputDir}", which contains the current working directory. Choose a nested output directory or set \`clear: false\`.`,
      )
    }

    await stat(config.outputDir)
      .then(async () => rm(config.outputDir, { recursive: true }))
      .catch(() => {})
  }

  await mkdir(config.outputDir, { recursive: true })
}
