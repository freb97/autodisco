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

  it('should merge same-discriminator-value objects and deduplicate union members', async () => {
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
        typescript: true,
      },
    })

    const schemaStat = await stat(`${outputDir}/typescript/get/Facets.ts`)
    expect(schemaStat.isFile()).toBe(true)

    const schemaContent = await readFile(`${outputDir}/typescript/get/Facets.ts`, 'utf-8')

    // "type": "range" should appear exactly once (the two range objects must be merged)
    expect(schemaContent.match(/"type": "range"/g)).toHaveLength(1)

    // counts should exist (merged from the range variant that has it, so optional)
    expect(schemaContent).toContain('"counts"')

    // scores field should be deduplicated — no consecutive duplicate members
    expect(schemaContent).not.toMatch(/unknown\[\] \| unknown\[\]/)

    // optionality should not be duplicated in unions
    expect(schemaContent).not.toMatch(/\| undefined \| undefined/)

    // generated unions should not include trailing padding before closing paren
    expect(schemaContent).not.toMatch(/\w\s{3,}\)/)

    // scores field should be a clean union of its two distinct types
    expect(schemaContent).toContain('unknown[] | number')
  })

  it('should prefer type as discriminator over high-cardinality keys', async () => {
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
        typescript: true,
      },
    })

    const schemaStat = await stat(`${outputDir}/typescript/get/Facet-counts.ts`)
    expect(schemaStat.isFile()).toBe(true)

    const schemaContent = await readFile(`${outputDir}/typescript/get/Facet-counts.ts`, 'utf-8')

    // Must discriminate by type and keep type as literals.
    expect(schemaContent).toContain('"type": "range"')
    expect(schemaContent).toContain('"type": "ignore"')

    // Must not explode one-variant-per-field_name.
    expect(schemaContent.match(/"field_name":/g)?.length).toBeLessThan(4)
  })

  it('should keep kind as a discriminator even when all kind values are unique', async () => {
    const { baseUrl, outputDir } = getTestBaseConfig()

    await discover({
      baseUrl,
      outputDir,
      probes: {
        get: {
          '/kind-variants': {},
        },
      },
      generate: {
        typescript: true,
      },
    })

    const schemaStat = await stat(`${outputDir}/typescript/get/Kind-variants.ts`)
    expect(schemaStat.isFile()).toBe(true)

    const schemaContent = await readFile(`${outputDir}/typescript/get/Kind-variants.ts`, 'utf-8')

    expect(schemaContent).toContain('"kind": "document"')
    expect(schemaContent).toContain('"kind": "facet.a"')
    expect(schemaContent).toContain('"kind": "facet.b"')
    expect(schemaContent).not.toContain('"kind": string')
  })
})
