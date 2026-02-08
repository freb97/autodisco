import type { DiscoverConfig } from '../../lib/config'

import { existsSync, statSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'
import process from 'node:process'
import { loadConfig } from 'c12'
import log from 'consola'

import discover from '../../index'

interface DiscoverArgs {
  configPath?: string
  path?: string
  method?: string
  query?: string
  params?: string
  body?: string
  headers?: string
  generate?: string
}

export async function runFromConfig(args: Pick<DiscoverArgs, 'configPath'>) {
  let configFile: string | undefined
  let cwd = process.cwd()

  if (args.configPath && args.configPath.length > 0) {
    const targetPath = isAbsolute(args.configPath) ? args.configPath : resolve(cwd, args.configPath)

    if (existsSync(targetPath)) {
      const stats = statSync(targetPath)
      if (stats.isFile()) {
        configFile = targetPath
        cwd = dirname(targetPath)
      }
      else if (stats.isDirectory()) {
        cwd = targetPath
      }
    }
    else {
      log.error(`No config found for path: ${targetPath}`)

      return
    }
  }

  const { config } = await loadConfig<DiscoverConfig>({
    name: 'autodisco',
    cwd,
    configFile,
    rcFile: 'autodisco-rc',
    globalRc: false,
    dotenv: false,
  })

  if (!config) {
    log.error('Failed to load configuration file.')

    return
  }

  await discover(config)
}

export async function runFromArgs(args: Omit<DiscoverArgs, 'configPath'>) {
  const generateArgs = args.generate ? args.generate.split(',').map(arg => arg.trim()) : []

  const config: DiscoverConfig = {
    baseUrl: args.path,

    probes: {
      [args.method?.toLowerCase() || 'get']: {
        '/': {
          body: args.body ? JSON.parse(args.body) : undefined,
          query: args.query ? JSON.parse(args.query) : undefined,
          headers: args.headers ? JSON.parse(args.headers) : undefined,
        },
      },
    },

    generate: args.generate
      ? {
          openapi: generateArgs.includes('openapi-typescript')
            ? { typescript: true }
            : generateArgs.includes('openapi') ? true : undefined,
          typescript: generateArgs.includes('typescript') ? true : undefined,
          json: generateArgs.includes('json') ? true : undefined,
          zod: generateArgs.includes('zod') ? true : undefined,
          markdown: generateArgs.includes('markdown') ? true : undefined,
        }
      : undefined,
  }

  await discover(config)
}
