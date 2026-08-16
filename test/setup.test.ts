import { mkdir, stat, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { describe, expect, it } from 'vitest'

import { discoverConfigSchemaWithDefaults } from '../src/lib/config'
import { prepare } from '../src/lib/setup'
import { getTestBaseConfig } from './setup/config'

function parseConfig(outputDir: string, clear: boolean) {
  return discoverConfigSchemaWithDefaults.parse({ outputDir, clear, probes: {} })
}

describe('output directory preparation', () => {
  it('should refuse to clear the working directory', async () => {
    await expect(prepare(parseConfig('.', true)))
      .rejects
      .toThrow(/Could not clear output directory/)
  })

  it('should refuse to clear a parent of the working directory', async () => {
    await expect(prepare(parseConfig('..', true)))
      .rejects
      .toThrow(/Could not clear output directory/)
  })

  it('should allow the working directory when clearing is disabled', async () => {
    await expect(prepare(parseConfig('.', false))).resolves.toBeUndefined()

    expect((await stat(process.cwd())).isDirectory()).toBe(true)
  })

  it('should clear a nested output directory', async () => {
    const { outputDir } = getTestBaseConfig()

    await mkdir(outputDir, { recursive: true })
    await writeFile(`${outputDir}/stale.txt`, 'stale')

    await prepare(parseConfig(outputDir, true))

    await expect(stat(`${outputDir}/stale.txt`)).rejects.toThrow()
    expect((await stat(outputDir)).isDirectory()).toBe(true)
  })
})
