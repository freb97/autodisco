import type { SchemaResult } from '../../types'
import type { ParsedDiscoverConfig } from '../config'

import { mkdir, writeFile } from 'node:fs/promises'
import { joinURL } from 'ufo'

import { resolveTypeName } from '../../helpers/path'
import { buildAST } from './ast/builder'
import { writeAST } from './ast/writer'

function generateFile(name: string, schema: string) {
  return `import { z } from 'zod';\n\nexport const ${name} = ${schema};`
}

/**
 * Generate Zod schema from parsed schema results
 *
 * @param schemaResults Array of schema results
 * @param config Parsed discovery configuration
 */
export async function generateZodSchemas(schemaResults: SchemaResult[], config: ParsedDiscoverConfig) {
  if (!config.generate?.zod) {
    return
  }

  const components = schemaResults.map(result => ({
    name: resolveTypeName(joinURL(config.baseUrl ?? '', result.path)),
    path: result.path,
    method: result.method,
    output: result.schema,
  }))

  const schemas = await Promise.all(components.map(async ({ output, ...rest }) => {
    await config.hooks.callHook('zod:generate', config, rest.method, rest.name, output)

    return {
      output: writeAST(buildAST(output)),
      ...rest,
    }
  }))

  await Promise.all(schemas.map(async ({ method }) =>
    mkdir(joinURL(config.outputDir, 'zod', method), { recursive: true })))

  await Promise.all(schemas.map(async ({ name, method, output }) =>
    writeFile(joinURL(config.outputDir, 'zod', method, `${name}.ts`), generateFile(name, output))))

  await config.hooks.callHook('zod:generated', config, schemas)

  return schemas
}
