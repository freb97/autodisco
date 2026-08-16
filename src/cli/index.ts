#!/usr/bin/env node

import { defineCommand, runMain } from 'citty'

import { runFromCliArgs } from './actions/discover'

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

    query: {
      type: 'string',
      description: 'Query parameters to use for the endpoint discovery, in JSON format. Only works when the path argument is provided.',
      required: false,
    },

    headers: {
      type: 'string',
      description: 'Request headers to use for the endpoint discovery, in JSON format. Only works when the path argument is provided.',
      required: false,
    },

    generate: {
      type: 'string',
      description: 'Which generators to run on the discovered endpoint. Only works when the path argument is provided. <openapi | openapi-typescript | typescript | json | zod | markdown>',
      required: false,
    },
  },

  run: ({ args }) => runFromCliArgs(args),
})

runMain(command)
