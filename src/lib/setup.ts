import type { ParsedDiscoverConfig } from './config.ts'

import { mkdir, rm, stat } from 'node:fs/promises'
import { joinURL } from 'ufo'

export async function prepare(config: ParsedDiscoverConfig) {
  if (config.clear) {
    await stat(config.outputDir)
      .then(async () => rm(config.outputDir, { recursive: true }))
      .catch(() => {})
  }

  await mkdir(config.outputDir, { recursive: true })

  await mkdir(joinURL(config.outputDir, 'zod'), { recursive: true })
  await mkdir(joinURL(config.outputDir, 'openapi'), { recursive: true })
}
