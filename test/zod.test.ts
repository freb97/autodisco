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
    expect(schemaContent).toContain('"active": z.boolean()')
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
    expect(schemaContent).toContain('"message": z.string()')
  })

  it('should handle discriminated array schemas', async () => {
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
        zod: true,
      },
    })

    const schemaStat = await stat(`${outputDir}/zod/get/Suggest.ts`)
    expect(schemaStat.isFile()).toBe(true)

    const schemaContent = await readFile(`${outputDir}/zod/get/Suggest.ts`, 'utf-8')

    expect(schemaContent).toContain('z.array(z.discriminatedUnion("type", [')
    expect(schemaContent).toContain('"type": z.literal("product")')
    expect(schemaContent).toContain('"type": z.literal("category")')
    expect(schemaContent).toContain('"type": z.literal("searchTerm")')
  })

  it('should merge same-discriminator-value schemas and deduplicate union members', async () => {
    const { baseUrl, outputDir } = getTestBaseConfig()

    await discover({
      baseUrl,
      outputDir,
      probes: {
        get: {
          '/facets': {},
        },
      },
      generate: {
        zod: true,
      },
    })

    const schemaStat = await stat(`${outputDir}/zod/get/Facets.ts`)
    expect(schemaStat.isFile()).toBe(true)

    const schemaContent = await readFile(`${outputDir}/zod/get/Facets.ts`, 'utf-8')

    // Should use discriminatedUnion
    expect(schemaContent).toContain('z.discriminatedUnion("type", [')

    // "range" literal should appear exactly once (merged)
    expect(schemaContent.match(/z\.literal\("range"\)/g)).toHaveLength(1)

    // scores field should not have duplicate array schemas
    expect(schemaContent).not.toMatch(/z\.array\(z\.any\(\)\), z\.array\(z\.any\(\)\)/)

    // optional wrappers should not stack
    expect(schemaContent).not.toMatch(/\.optional\(\)\.optional\(\)/)
  })

  it('should prefer type discriminator over high-cardinality keys', async () => {
    const { baseUrl, outputDir } = getTestBaseConfig()

    await discover({
      baseUrl,
      outputDir,
      probes: {
        get: {
          '/facet-counts': {},
        },
      },
      generate: {
        zod: true,
      },
    })

    const schemaStat = await stat(`${outputDir}/zod/get/Facet-counts.ts`)
    expect(schemaStat.isFile()).toBe(true)

    const schemaContent = await readFile(`${outputDir}/zod/get/Facet-counts.ts`, 'utf-8')

    expect(schemaContent).toContain('z.discriminatedUnion("type", [')
    expect(schemaContent).toContain('"type": z.literal("range")')
    expect(schemaContent).toContain('"type": z.literal("ignore")')
  })

  it('should keep kind as discriminator when kind values are unique', async () => {
    const { baseUrl, outputDir } = getTestBaseConfig()

    await discover({
      baseUrl,
      outputDir,
      probes: {
        get: {
          '/kind-variants': {
            discriminators: ['kind'],
          },
        },
      },
      generate: {
        zod: true,
      },
    })

    const schemaStat = await stat(`${outputDir}/zod/get/Kind-variants.ts`)
    expect(schemaStat.isFile()).toBe(true)

    const schemaContent = await readFile(`${outputDir}/zod/get/Kind-variants.ts`, 'utf-8')

    expect(schemaContent).toContain('z.discriminatedUnion("kind", [')
    expect(schemaContent).toContain('"kind": z.literal("document")')
    expect(schemaContent).toContain('"kind": z.literal("facet.a")')
    expect(schemaContent).toContain('"kind": z.literal("facet.b")')
  })
})
