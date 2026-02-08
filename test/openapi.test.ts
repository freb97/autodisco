import { readFile, stat } from 'node:fs/promises'
import { afterAll, describe, expect, it, vi } from 'vitest'

import discover from '../src/index'
import { getTestBaseConfig } from './setup/config'

describe('openapi schema generation', () => {
  const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

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
    expect(schemaJson).toHaveProperty('paths./users/{id}.get.parameters.0.name', 'id')
    expect(schemaJson).toHaveProperty('components.schemas.GetUsers.properties.id.type', 'number')

    expect(schemaJson).toHaveProperty('paths./products.get')
    expect(schemaJson).toHaveProperty('components.schemas.GetProducts.type', 'array')
    expect(schemaJson).toHaveProperty('components.schemas.GetProducts.items.properties.id.type', 'string')
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

    expect(schemaJson).toHaveProperty('paths./users.post.requestBody.content.application/json.schema.$ref', '#/components/schemas/PostUsersRequestBody')
    expect(schemaJson).toHaveProperty('components.schemas.PostUsersRequestBody.properties.name.type', 'string')
    expect(schemaJson).toHaveProperty('components.schemas.PostUsers.properties.id.type', 'number')
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
    })

    const schemaStat = await stat(`${outputDir}/openapi/schema.json`)
    expect(schemaStat.isFile()).toBe(true)

    const schemaContent = await readFile(`${outputDir}/openapi/schema.json`, 'utf-8')
    const schemaJson = JSON.parse(schemaContent)

    expect(schemaJson).toHaveProperty('openapi', '3.1.1')
    expect(schemaJson).toHaveProperty('paths./suggest.get')

    expect(schemaJson).toHaveProperty('components.schemas.GetSuggest.type', 'array')
    expect(schemaJson).toHaveProperty('components.schemas.GetSuggest.items.oneOf')
    expect(schemaJson.components.schemas.GetSuggest.items.oneOf).toHaveLength(3)

    expect(schemaJson.components.schemas.GetSuggest.items.oneOf[0]).toHaveProperty('properties.type.const', 'product')
    expect(schemaJson.components.schemas.GetSuggest.items.oneOf[1]).toHaveProperty('properties.type.const', 'category')
    expect(schemaJson.components.schemas.GetSuggest.items.oneOf[2]).toHaveProperty('properties.type.const', 'searchTerm')
  })

  it('should handle empty probe config', async () => {
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

  it('should handle empty probe response', async () => {
    const { baseUrl, outputDir } = getTestBaseConfig()

    await discover({
      baseUrl,
      outputDir,
      probes: {
        get: {
          '/empty': {},
        },
      },
    })

    const schemaStat = await stat(`${outputDir}/openapi/schema.json`)
    expect(schemaStat.isFile()).toBe(true)

    const schemaContent = await readFile(`${outputDir}/openapi/schema.json`, 'utf-8')
    const schemaJson = JSON.parse(schemaContent)

    expect(schemaJson).toHaveProperty('openapi', '3.1.1')
    expect(schemaJson).toHaveProperty('paths')

    const stderrCalls = stderrSpy.mock.calls.map(call => call[0].toString())
    expect(stderrCalls.some(
      call => call.includes('Did not receive any valid probe responses'),
    )).toBe(true)
  })

  it('should handle error responses (e.g. 404)', async () => {
    const { baseUrl, outputDir } = getTestBaseConfig()

    await discover({
      baseUrl,
      outputDir,
      probes: {
        get: {
          '/does-not-exist': {},
        },
      },
    })

    const schemaStat = await stat(`${outputDir}/openapi/schema.json`)
    expect(schemaStat.isFile()).toBe(true)

    const schemaContent = await readFile(`${outputDir}/openapi/schema.json`, 'utf-8')
    const schemaJson = JSON.parse(schemaContent)

    expect(schemaJson).toHaveProperty('openapi', '3.1.1')
    expect(schemaJson).toHaveProperty('paths')

    const stderrCalls = stderrSpy.mock.calls.map(call => call[0].toString())
    expect(stderrCalls.some(
      call => call.includes('Received error response fetching "get /does-not-exist": Not Found'),
    )).toBe(true)
  })

  afterAll(() => {
    stderrSpy.mockRestore()
  })
})
