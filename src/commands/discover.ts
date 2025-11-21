#!/usr/bin/env node

import type { DiscoverConfig } from '../lib/config'

import { existsSync, statSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'
import process from 'node:process'
import { loadConfig } from 'c12'
import { defineCommand, runMain } from 'citty'
import log from 'consola'

import discover from '../index'

const command = defineCommand({
  meta: {
    name: 'discover',
    description: 'Run the discovery process.',
  },

  args: {
    path: {
      type: 'positional',
      description: 'Location of the autodisco config file or directory.',
      required: false,
    },
  },

  run: async ({ args }) => {
    let configFile: string | undefined
    let cwd = process.cwd()

    if (args.path && args.path.length > 0) {
      const targetPath = isAbsolute(args.path) ? args.path : resolve(cwd, args.path)

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
  },
})

runMain(command)
