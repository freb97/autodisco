import { readFile, stat } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

import discover from '../src/index'
import { getTestBaseConfig } from './setup/config'

describe('zod schema generation', () => {
  it('should generate get response schemas', async () => {
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
        zod: true,
      },
    })

    const schemaStat = await stat(`${outputDir}/zod/get/Users.ts`)
    expect(schemaStat.isFile()).toBe(true)

    const schemaContent = await readFile(`${outputDir}/zod/get/Users.ts`, 'utf-8')

    expect(schemaContent).toContain('"id": z.number(),')
    expect(schemaContent).toContain('"name": z.string(),')
    expect(schemaContent).toContain('"email": z.string(),')
    expect(schemaContent).toContain('"active": z.boolean(),')
  })

  it('should generate post response schemas', async () => {
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
        zod: true,
      },
    })

    const schemaStat = await stat(`${outputDir}/zod/post/Users.ts`)
    expect(schemaStat.isFile()).toBe(true)

    const schemaContent = await readFile(`${outputDir}/zod/post/Users.ts`, 'utf-8')

    expect(schemaContent).toContain('"id": z.number(),')
    expect(schemaContent).toContain('"success": z.boolean(),')
    expect(schemaContent).toContain('"message": z.string(),')
  })
})
