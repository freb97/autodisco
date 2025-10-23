import type { ParsedDiscoverConfig } from '../config'

import { mkdir, writeFile } from 'node:fs/promises'
import { joinURL } from 'ufo'

export async function generateTypeScriptTypes(openApiResult: string, config: ParsedDiscoverConfig) {
  if (!config.generate?.typescript) {
    return
  }

  return import('openapi-typescript').then(async (openapiTS) => {
    let openapiTSOptions = {}

    if (typeof config.generate?.typescript === 'object') {
      openapiTSOptions = config.generate.typescript
    }

    const ast = await openapiTS.default(openApiResult, openapiTSOptions)
    const contents = openapiTS.astToString(ast)

    await mkdir(joinURL(config.outputDir, 'typescript'), { recursive: true })
      .then(() => writeFile(joinURL(config.outputDir, 'typescript', 'types.d.ts'), contents))
  }).catch((error) => {
    throw new Error('openapi-typescript is required to generate TypeScript types.\nYou can install it with: npm install openapi-typescript', { cause: error })
  })
}
