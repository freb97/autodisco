import { readFile, stat } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

import discover from '../src/index'
import { getTestBaseConfig } from './setup/config'

describe('openapi schema generation', () => {
  it('should generate get response schemas', async () => {
    const { baseUrl, outputDir } = getTestBaseConfig()

    await discover({
      baseUrl,
      outputDir,
      probes: {
        get: {
          '/products': {},
          '/users/{id}': {
            params: {
              id: 1,
            },
          },
        },
      },
    })

    const schemaStat = await stat(`${outputDir}/openapi/schema.json`)
    expect(schemaStat.isFile()).toBe(true)

    const schemaContent = await readFile(`${outputDir}/openapi/schema.json`, 'utf-8')
    const schemaJson = JSON.parse(schemaContent)

    expect(schemaJson).toHaveProperty('openapi', '3.1.1')

    expect(schemaJson).toHaveProperty('paths./users/{id}.get')
    expect(schemaJson).toHaveProperty('components.schemas.Users')
    expect(schemaJson).toHaveProperty('components.schemas.Users.type', 'object')

    expect(schemaJson).toHaveProperty('paths./products.get')
    expect(schemaJson).toHaveProperty('components.schemas.Products.type', 'array')
  })

  it('should generate post request schemas', async () => {
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
    })

    const schemaStat = await stat(`${outputDir}/openapi/schema.json`)
    expect(schemaStat.isFile()).toBe(true)

    const schemaContent = await readFile(`${outputDir}/openapi/schema.json`, 'utf-8')
    const schemaJson = JSON.parse(schemaContent)

    expect(schemaJson).toHaveProperty('openapi', '3.1.1')
    expect(schemaJson).toHaveProperty('paths./users.post')
    expect(schemaJson).toHaveProperty('components.schemas.Users.type', 'object')
  })

  it('should handle empty probe results', async () => {
    const { outputDir } = getTestBaseConfig()

    await discover({
      outputDir,
      probes: {
        get: {},
      },
    })

    const schemaStat = await stat(`${outputDir}/openapi/schema.json`)
    expect(schemaStat.isFile()).toBe(true)

    const schemaContent = await readFile(`${outputDir}/openapi/schema.json`, 'utf-8')
    const schemaJson = JSON.parse(schemaContent)

    expect(schemaJson).toHaveProperty('openapi', '3.1.1')
    expect(schemaJson).toHaveProperty('paths')
  })
})
