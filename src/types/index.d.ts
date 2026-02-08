import type { ZodType } from 'zod'

import type { HttpMethod, ProbeConfig } from '../lib/config'

export type HookResult = Promise<void> | void

export interface SchemaResult {
  method: HttpMethod
  path: string
  config: ProbeConfig
  schema: ZodType
  bodySchema?: ZodType
}

export interface ProbeResult {
  method: HttpMethod
  path: string
  config: ProbeConfig & { baseUrl?: string }
  samples: string[]
}

export interface OutputResult {
  name: string
  path: string
  method: HttpMethod
  output: string
}

export interface DiscoverHooks {
  'discovery:start': (config: ParsedDiscoverConfig) => HookResult
  'discovery:completed': (config: ParsedDiscoverConfig, totalTime: number, totalProbingTime: number) => HookResult

  'probe:request': (method: HttpMethod, path: string, probeConfig: ProbeConfig & { baseUrl?: string }) => HookResult
  'probe:response': (method: HttpMethod, path: string, probeConfig: ProbeConfig & { baseUrl?: string }, response: string) => HookResult
  'probes:completed': (config: ParsedDiscoverConfig, results: ProbeResult[]) => HookResult

  'zod:runtime:generate': (config: ParsedDiscoverConfig, method: HttpMethod, path: string, schemaConfig: ProbeResult['config'], sample: any) => HookResult
  'zod:runtime:generated': (config: ParsedDiscoverConfig, results: SchemaResult[]) => HookResult

  'zod:generate': (config: ParsedDiscoverConfig, method: HttpMethod, name: string, schema: z.ZodType) => HookResult
  'zod:generated': (config: ParsedDiscoverConfig, result: OutputResult[]) => HookResult

  'json:generate': (config: ParsedDiscoverConfig, method: HttpMethod, name: string, schema: z.ZodType) => HookResult
  'json:generated': (config: ParsedDiscoverConfig, result: OutputResult[]) => HookResult

  'typescript:generate': (config: ParsedDiscoverConfig, method: HttpMethod, name: string, schema: z.ZodType) => HookResult
  'typescript:generated': (config: ParsedDiscoverConfig, result: OutputResult[]) => HookResult

  'markdown:generate': (config: ParsedDiscoverConfig, method: HttpMethod, name: string, schema: z.ZodType) => HookResult
  'markdown:generated': (config: ParsedDiscoverConfig, result: string) => HookResult

  'openapi:generate': (config: ParsedDiscoverConfig, components: ZodOpenApiComponentsObject, paths: ZodOpenApiPathsObject) => HookResult
  'openapi:generated': (config: ParsedDiscoverConfig, result: string) => HookResult

  'openapi:typescript:generate': (config: ParsedDiscoverConfig, openapiTSOptions: any) => HookResult
  'openapi:typescript:generated': (config: ParsedDiscoverConfig, result: string) => HookResult
}
