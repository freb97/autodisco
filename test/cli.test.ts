import type { DiscoverConfig } from '../src/lib/config'

import { resolve } from 'node:path'
import process from 'node:process'
import { loadConfig } from 'c12'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { runFromArgs, runFromCliArgs, runFromConfig } from '../src/cli/actions/discover'
import discover from '../src/index'

vi.mock('../src/index', () => ({ default: vi.fn() }))
vi.mock('c12', () => ({ loadConfig: vi.fn() }))

const discovered = vi.mocked(discover)
const loaded = vi.mocked(loadConfig)

function lastConfig(): DiscoverConfig {
  return discovered.mock.calls.at(-1)![0]
}

function lastLoadOptions() {
  return loaded.mock.calls.at(-1)![0]!
}

beforeEach(() => {
  discovered.mockClear()
  loaded.mockReset()
  loaded.mockResolvedValue({ config: { baseUrl: 'https://api.example.com', probes: {} } } as never)
  process.exitCode = 0
})

afterEach(() => {
  process.exitCode = 0
})

describe('runFromArgs', () => {
  it('should split an endpoint URL into a base URL and a path', async () => {
    await runFromArgs({ path: 'https://api.example.com/users/1' })

    expect(lastConfig()).toHaveProperty('baseUrl', 'https://api.example.com')
    expect(lastConfig().probes).toHaveProperty(['get', '/users/1'])
  })

  it('should default to GET and lowercase the method', async () => {
    await runFromArgs({ path: 'https://api.example.com/users', method: 'POST' })

    expect(Object.keys(lastConfig().probes)).toEqual(['post'])
  })

  it('should wire up params, query, headers and body', async () => {
    await runFromArgs({
      path: 'https://api.example.com/users/{id}',
      method: 'put',
      params: '{"id":1}',
      query: '{"expand":"profile"}',
      headers: '{"X-Api-Key":"secret"}',
      body: '{"name":"Jane"}',
    })

    expect(lastConfig().probes.put).toHaveProperty(['/users/{id}'], {
      params: { id: 1 },
      query: { expand: 'profile' },
      headers: { 'X-Api-Key': 'secret' },
      body: { name: 'Jane' },
    })
  })

  it('should report which argument contained invalid JSON', async () => {
    await expect(runFromArgs({ path: 'https://api.example.com', query: '{oops' }))
      .rejects
      .toThrow(/Invalid JSON passed to --query/)

    expect(discovered).not.toHaveBeenCalled()
  })

  it('should map generator names onto the generate config', async () => {
    await runFromArgs({ path: 'https://api.example.com', generate: 'zod, json' })

    expect(lastConfig().generate).toMatchObject({ zod: true, json: true })
    expect(lastConfig().generate).toMatchObject({ typescript: undefined, markdown: undefined })
  })

  it('should treat openapi-typescript as openapi with typescript output', async () => {
    await runFromArgs({ path: 'https://api.example.com', generate: 'openapi-typescript' })

    expect(lastConfig().generate).toMatchObject({ openapi: { typescript: true } })
  })

  it('should not run without an endpoint', async () => {
    await runFromArgs({ method: 'post' })

    expect(discovered).not.toHaveBeenCalled()
  })
})

describe('runFromConfig', () => {
  it('should load a config file passed by path', async () => {
    await runFromConfig({ configPath: 'examples/jsonplaceholder/autodisco.config.ts' })

    expect(lastLoadOptions()).toMatchObject({
      configFile: resolve('examples/jsonplaceholder/autodisco.config.ts'),
      cwd: resolve('examples/jsonplaceholder'),
    })
    expect(discovered).toHaveBeenCalledTimes(1)
  })

  it('should load a config file from a directory', async () => {
    await runFromConfig({ configPath: 'examples/jsonplaceholder' })

    expect(lastLoadOptions()).toMatchObject({ cwd: resolve('examples/jsonplaceholder') })
    expect(lastLoadOptions().configFile).toBeUndefined()
    expect(discovered).toHaveBeenCalledTimes(1)
  })

  it('should not run when the path does not exist', async () => {
    await runFromConfig({ configPath: 'examples/does-not-exist' })

    expect(loaded).not.toHaveBeenCalled()
    expect(discovered).not.toHaveBeenCalled()
  })

  it('should not run when no config is found', async () => {
    loaded.mockResolvedValue({ config: {} } as never)

    await runFromConfig({ configPath: 'test/setup' })

    expect(discovered).not.toHaveBeenCalled()
  })
})

describe('runFromCliArgs', () => {
  it('should treat a positional URL as an endpoint', async () => {
    await runFromCliArgs({ configPath: 'https://api.example.com/users' })

    expect(lastConfig()).toHaveProperty('baseUrl', 'https://api.example.com')
    expect(lastConfig().probes).toHaveProperty(['get', '/users'])
  })

  it('should treat a positional non-URL as a config location', async () => {
    await runFromCliArgs({ configPath: 'examples/jsonplaceholder' })

    expect(lastLoadOptions()).toMatchObject({ cwd: resolve('examples/jsonplaceholder') })
    expect(discovered).toHaveBeenCalledTimes(1)
  })

  it('should use --path when no positional argument is given', async () => {
    await runFromCliArgs({ path: 'https://api.example.com/users' })

    expect(lastConfig()).toHaveProperty('baseUrl', 'https://api.example.com')
  })

  it('should fall back to the config in the working directory', async () => {
    await runFromCliArgs({})

    expect(lastLoadOptions()).toMatchObject({ cwd: process.cwd() })
    expect(lastLoadOptions().configFile).toBeUndefined()
    expect(discovered).toHaveBeenCalledTimes(1)
  })

  it('should report errors instead of throwing', async () => {
    await expect(runFromCliArgs({ path: 'https://api.example.com', body: '{oops' })).resolves.toBeUndefined()

    expect(discovered).not.toHaveBeenCalled()
    expect(process.exitCode).toBe(1)
  })
})
