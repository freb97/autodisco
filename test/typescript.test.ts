import { readFile, stat } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

import discover from '../src/index'
import { getTestBaseConfig } from './setup/config'

describe('typescript types generation', () => {
  it('should generate typescript types', async () => {
    const { baseUrl, outputDir } = getTestBaseConfig()

    await discover({
      baseUrl,
      outputDir,
      probes: {
        get: {
          '/users': {},
        },
      },
      generate: {
        typescript: true,
      },
    })

    const typesFileStat = await stat(`${outputDir}/typescript/types.d.ts`)
    expect(typesFileStat.isFile()).toBe(true)

    const typesFileContent = await readFile(`${outputDir}/typescript/types.d.ts`, 'utf-8')
    expect(typesFileContent).toBeDefined()
  })
})
