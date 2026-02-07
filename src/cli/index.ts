#!/usr/bin/env node

import { defineCommand, runMain } from 'citty'

import { runFromArgs, runFromConfig } from './actions/discover'

const command = defineCommand({
  meta: {
    name: 'discover',
    description: 'Run the discovery process.',
  },

  args: {
    configPath: {
      type: 'positional',
      description: 'Location of the autodisco config file or directory.',
      required: false,
    },

    path: {
      type: 'string',
      description: 'Path to an endpoint to discover. If not provided, autodisco will fall back to the config file.',
      required: false,
    },

    method: {
      type: 'string',
      description: 'HTTP method to use for the endpoint discovery. Only works when the path argument is provided.',
      required: false,
    },

    body: {
      type: 'string',
      description: 'Request body to use for the endpoint discovery. Only works when the path argument is provided.',
      required: false,
    },

    headers: {
      type: 'string',
      description: 'Request headers to use for the endpoint discovery, in JSON format. Only works when the path argument is provided.',
      required: false,
    },

    generate: {
      type: 'enum',
      description: 'Which generators to run on the discovered endpoint. Only works when the path argument is provided.',
      options: ['typescript', 'json', 'zod'],
      required: false,
    },
  },

  run: async ({ args }) => {
    const configPathProvided = Object.entries(args).length === 2 || (args.configPath && args.configPath.length > 0)
    const configPathIsUrl = args.configPath?.startsWith('http://') || args.configPath?.startsWith('https://')

    if (configPathProvided) {
      if (!configPathIsUrl) {
        await runFromConfig(args)
      }
      else {
        await runFromArgs({ ...args, path: args.configPath })
      }
    }
    else if (args.path) {
      await runFromArgs(args)
    }
  },
})

runMain(command)
