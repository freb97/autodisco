import { readdir, readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

import discover from '../src/index'
import { getTestBaseConfig } from './setup/config'

describe('type name collisions', () => {
  it('should give colliding paths distinct file names', async () => {
    const { baseUrl, outputDir } = getTestBaseConfig()

    await discover({
      baseUrl,
      outputDir,
      generate: { typescript: true, zod: true, json: true },
      probes: {
        get: {
          '/users': {},
          '/users/{id}': { params: { id: 1 } },
        },
      },
    })

    expect((await readdir(`${outputDir}/typescript/get`)).sort()).toEqual(['Users.ts', 'UsersId.ts'])
    expect((await readdir(`${outputDir}/zod/get`)).sort()).toEqual(['Users.ts', 'UsersId.ts'])
    expect((await readdir(`${outputDir}/json/get`)).sort()).toEqual(['Users.json', 'UsersId.json'])
  })

  it('should not corrupt the contents of colliding files', async () => {
    const { baseUrl, outputDir } = getTestBaseConfig()

    await discover({
      baseUrl,
      outputDir,
      generate: { typescript: true },
      probes: {
        get: {
          '/users': {},
          '/users/{id}': { params: { id: 1 } },
        },
      },
    })

    const collection = await readFile(`${outputDir}/typescript/get/Users.ts`, 'utf-8')
    const single = await readFile(`${outputDir}/typescript/get/UsersId.ts`, 'utf-8')

    expect(collection).toMatch(/^export type Users = \{/)
    expect(collection.trimEnd()).toMatch(/\}\[\];$/)

    expect(single).toMatch(/^export type UsersId = \{/)
    expect(single.trimEnd()).toMatch(/\};$/)

    for (const output of [collection, single]) {
      expect(output).not.toMatch(/;\]/)
      expect(output.match(/export type/g)).toHaveLength(1)
    }
  })

  it('should keep colliding openapi component names distinct', async () => {
    const { baseUrl, outputDir } = getTestBaseConfig()

    await discover({
      baseUrl,
      outputDir,
      probes: {
        get: {
          '/users': {},
          '/users/{id}': { params: { id: 1 } },
        },
      },
    })

    const schemaJson = JSON.parse(await readFile(`${outputDir}/openapi/schema.json`, 'utf-8'))

    expect(schemaJson).toHaveProperty('components.schemas.GetUsers.type', 'array')
    expect(schemaJson).toHaveProperty('components.schemas.GetUsersId.type', 'object')
  })

  it('should not collide across different methods', async () => {
    const { baseUrl, outputDir } = getTestBaseConfig()

    await discover({
      baseUrl,
      outputDir,
      generate: { typescript: true },
      probes: {
        get: { '/users': {} },
        post: { '/users': { body: { name: 'Jane Doe' } } },
      },
    })

    expect(await readdir(`${outputDir}/typescript/get`)).toEqual(['Users.ts'])
    expect(await readdir(`${outputDir}/typescript/post`)).toEqual(['Users.ts'])
  })
})

describe('multiple methods on one path', () => {
  it('should keep every method in the openapi document', async () => {
    const { baseUrl, outputDir } = getTestBaseConfig()

    await discover({
      baseUrl,
      outputDir,
      probes: {
        get: { '/users': {} },
        post: { '/users': { body: { name: 'Jane Doe' } } },
      },
    })

    const schemaJson = JSON.parse(await readFile(`${outputDir}/openapi/schema.json`, 'utf-8'))

    expect(Object.keys(schemaJson.paths['/users']).sort()).toEqual(['get', 'post'])

    expect(schemaJson).toHaveProperty('paths./users.get.responses.200.$ref', '#/components/responses/GetUsersResponse')
    expect(schemaJson).toHaveProperty('paths./users.post.responses.200.$ref', '#/components/responses/PostUsersResponse')
  })
})
