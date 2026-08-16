import { describe, expect, it } from 'vitest'

import discover from '../src/index'
import { getTestBaseConfig } from './setup/config'

interface EchoedRequest {
  method: string
  body: string
  contentType: string | null
}

async function probeEcho(body: unknown, headers?: Record<string, string>) {
  const { baseUrl, outputDir } = getTestBaseConfig()

  let echoed: EchoedRequest | undefined

  await discover({
    baseUrl,
    outputDir,
    headers,
    probes: {
      post: {
        '/echo': { body },
      },
    },
    hooks: {
      'probe:response': (_method, _path, _probeConfig, response) => {
        echoed = JSON.parse(response) as EchoedRequest
      },
    },
  })

  return echoed!
}

describe('probe request bodies', () => {
  it('should send object bodies as JSON', async () => {
    const echoed = await probeEcho({ title: 'New Todo', completed: false })

    expect(echoed.body).toBe('{"title":"New Todo","completed":false}')
    expect(echoed.contentType).toBe('application/json')
  })

  it('should send array bodies as JSON', async () => {
    const echoed = await probeEcho([{ id: 1 }, { id: 2 }])

    expect(echoed.body).toBe('[{"id":1},{"id":2}]')
    expect(echoed.contentType).toBe('application/json')
  })

  it('should pass string bodies through untouched', async () => {
    const echoed = await probeEcho('raw-payload')

    expect(echoed.body).toBe('raw-payload')
    expect(echoed.contentType).toBe('text/plain;charset=UTF-8')
  })

  it('should not override an explicitly configured content type', async () => {
    const echoed = await probeEcho({ a: 1 }, { 'Content-Type': 'application/vnd.api+json' })

    expect(echoed.body).toBe('{"a":1}')
    expect(echoed.contentType).toBe('application/vnd.api+json')
  })

  it('should send no body when none is configured', async () => {
    const echoed = await probeEcho(undefined)

    expect(echoed.body).toBe('')
  })
})

describe('probe hooks', () => {
  it('should pass the resolved probe config to both request and response hooks', async () => {
    const { baseUrl, outputDir } = getTestBaseConfig()

    const seen: Record<string, unknown>[] = []

    await discover({
      baseUrl,
      outputDir,
      headers: { 'X-Global': 'global' },
      probes: {
        get: {
          '/users': { headers: { 'X-Probe': 'probe' } },
        },
      },
      hooks: {
        'probe:request': (_method, _path, probeConfig) => {
          seen.push(probeConfig)
        },
        'probe:response': (_method, _path, probeConfig) => {
          seen.push(probeConfig)
        },
      },
    })

    expect(seen).toHaveLength(2)

    for (const probeConfig of seen) {
      expect(probeConfig).toHaveProperty('baseUrl', baseUrl)
      expect(probeConfig).toHaveProperty('headers.X-Global', 'global')
      expect(probeConfig).toHaveProperty('headers.X-Probe', 'probe')
    }
  })
})
