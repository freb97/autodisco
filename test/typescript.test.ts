import { readFile, stat } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

import discover from '../src/index'
import { getTestBaseConfig } from './setup/config'

describe('typescript type generation', () => {
  it('should generate get response types', async () => {
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

    const schemaStat = await stat(`${outputDir}/typescript/get/Users.ts`)
    expect(schemaStat.isFile()).toBe(true)

    const schemaContent = await readFile(`${outputDir}/typescript/get/Users.ts`, 'utf-8')

    expect(schemaContent).toContain('"id": number')
    expect(schemaContent).toContain('"name": string')
    expect(schemaContent).toContain('"email": string')
    expect(schemaContent).toContain('"active": boolean')
  })

  it('should generate post response types', async () => {
    const { baseUrl, outputDir } = getTestBaseConfig()

    await discover({
      baseUrl,
      outputDir,
      probes: {
        post: {
          '/users': {
            body: {
              name: 'Jane Doe',
              email: 'jane@example.com',
              active: true,
            },
          },
        },
      },
      generate: {
        typescript: true,
      },
    })

    const schemaStat = await stat(`${outputDir}/typescript/post/Users.ts`)
    expect(schemaStat.isFile()).toBe(true)

    const schemaContent = await readFile(`${outputDir}/typescript/post/Users.ts`, 'utf-8')

    expect(schemaContent).toContain('"id": number')
    expect(schemaContent).toContain('"success": boolean')
    expect(schemaContent).toContain('"message": string')
  })

  it('should handle discriminated array types', async () => {
    const { baseUrl, outputDir } = getTestBaseConfig()

    await discover({
      baseUrl,
      outputDir,
      probes: {
        get: {
          '/suggest': {
            query: {
              q: 'test',
            },
          },
        },
      },
      generate: {
        typescript: true,
      },
    })

    const schemaStat = await stat(`${outputDir}/typescript/get/Suggest.ts`)
    expect(schemaStat.isFile()).toBe(true)

    const schemaContent = await readFile(`${outputDir}/typescript/get/Suggest.ts`, 'utf-8')

    expect(schemaContent).toContain('"type": "product"')
    expect(schemaContent).toContain('"type": "category"')
    expect(schemaContent).toContain('"type": "searchTerm"')
  })
})
