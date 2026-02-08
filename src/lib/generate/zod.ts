import type { ParsedDiscoverConfig, SchemaResult } from '../config'

import { mkdir, writeFile } from 'node:fs/promises'
import { joinURL } from 'ufo'

import { resolveTypeName } from '../../helpers/path'
import { buildAST } from './zod/builder'
import { writeAST } from './zod/writer'

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
    method: result.method,
    schema: result.schema,
  }))

  const schemas = await Promise.all(components.map(async ({ schema, ...rest }) => {
    await config.hooks.callHook('zod:generate', config, rest.method, rest.name, schema)

    return {
      schema: writeAST(buildAST(schema)),
      ...rest,
    }
  }))

  await Promise.all(schemas.map(async ({ name, method, schema }) =>
    mkdir(joinURL(config.outputDir, 'zod', method), { recursive: true }).then(() =>
      writeFile(joinURL(config.outputDir, 'zod', method, `${name}.ts`), generateFile(name, schema)))))

  await config.hooks.callHook('zod:generated', config, schemas)
}
