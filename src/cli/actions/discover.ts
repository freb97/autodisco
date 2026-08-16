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
  body?: string
  headers?: string
  generate?: string
}

/**
 * Parse a JSON encoded CLI argument
 *
 * @param value Raw argument value
 * @param name Argument name, used for error reporting
 *
 * @returns The parsed value, or undefined if the argument was not provided
 */
function parseJsonArg(value: string | undefined, name: string) {
  if (value === undefined || value.length === 0) {
    return undefined
  }

  try {
    return JSON.parse(value)
  }
  catch (error) {
    throw new Error(
      `Invalid JSON passed to --${name}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    )
  }
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

      process.exitCode = 1

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

  if (!config || Object.keys(config).length === 0) {
    log.error(`No autodisco configuration found in "${cwd}". Create an autodisco.config.ts file, or pass an endpoint with --path.`)

    process.exitCode = 1

    return
  }

  await discover(config)
}

/**
 * Route parsed CLI arguments to the matching discovery run
 *
 * @param args Parsed CLI arguments
 */
export async function runFromCliArgs(args: DiscoverArgs) {
  const configPath = args.configPath?.trim()

  try {
    if (/^https?:\/\//.test(configPath ?? '')) {
      await runFromArgs({ ...args, path: configPath })
    }
    else if (!configPath && args.path) {
      await runFromArgs(args)
    }
    else {
      await runFromConfig({ configPath })
    }
  }
  catch (error) {
    log.error(error instanceof Error ? error.message : error)

    process.exitCode = 1
  }
}

export async function runFromArgs(args: Omit<DiscoverArgs, 'configPath'>) {
  if (!args.path) {
    log.error('No endpoint provided. Pass an endpoint with --path, or point at a config file.')

    process.exitCode = 1

    return
  }

  const generateArgs = args.generate ? args.generate.split(',').map(arg => arg.trim()) : []

  const config: DiscoverConfig = {
    baseUrl: args.path,

    probes: {
      [args.method?.toLowerCase() || 'get']: {
        '/': {
          body: parseJsonArg(args.body, 'body'),
          query: parseJsonArg(args.query, 'query'),
          headers: parseJsonArg(args.headers, 'headers'),
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
