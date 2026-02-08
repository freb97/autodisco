import type { ParsedDiscoverConfig } from '../config'

import { mkdir, writeFile } from 'node:fs/promises'
import { joinURL } from 'ufo'

/**
 * Generate TypeScript types from OpenAPI schema result
 *
 * @param openApiResult OpenAPI schema result as JSON string
 * @param config Parsed discovery configuration
 */
export async function generateTypeScriptTypes(openApiResult: string | undefined, config: ParsedDiscoverConfig) {
  if (!config.generate?.typescript || !openApiResult) {
    return
  }

  return import('openapi-typescript').then(async (openapiTS) => {
    let openapiTSOptions = {}

    if (typeof config.generate?.typescript === 'object') {
      openapiTSOptions = config.generate.typescript
    }

    await config.hooks.callHook('typescript:generate', config, openapiTSOptions)

    const ast = await openapiTS.default(openApiResult, openapiTSOptions)
    const result = openapiTS.astToString(ast)

    await config.hooks.callHook('typescript:generated', config, result)

    await mkdir(joinURL(config.outputDir, 'typescript'), { recursive: true })
      .then(() => writeFile(joinURL(config.outputDir, 'typescript', 'openapi.d.ts'), result))

    return result
  }).catch((error) => {
    throw new Error('openapi-typescript is required to generate TypeScript types.\nYou can install it with: npm install openapi-typescript', { cause: error })
  })
}
