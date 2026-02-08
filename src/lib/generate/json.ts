import type { SchemaResult } from '../../types'
import type { ParsedDiscoverConfig } from '../config'

import { mkdir, writeFile } from 'node:fs/promises'
import { joinURL } from 'ufo'

import { resolveTypeName } from '../../helpers/path'

/**
 * Generate JSON schema from parsed schema results
 *
 * @param schemaResults Array of schema results
 * @param config Parsed discovery configuration
 *
 * @return Generated JSON schemas
 */
export async function generateJsonSchema(schemaResults: SchemaResult[], config: ParsedDiscoverConfig) {
  if (!config.generate?.json) {
    return
  }

  const components = schemaResults.map(result => ({
    name: resolveTypeName(joinURL(config.baseUrl ?? '', result.path)),
    path: result.path,
    method: result.method,
    output: result.schema,
  }))

  const schemas = await Promise.all(components.map(async ({ output, ...rest }) => {
    await config.hooks.callHook('json:generate', config, rest.method, rest.name, output)

    return {
      output: JSON.stringify(output.toJSONSchema(), undefined, config.minify ? 0 : 2),
      ...rest,
    }
  }))

  await Promise.all(schemas.map(async ({ method }) =>
    mkdir(joinURL(config.outputDir, 'json', method), { recursive: true })))

  await Promise.all(schemas.map(async ({ name, method, output }) =>
    writeFile(joinURL(config.outputDir, 'json', method, `${name}.json`), output)))

  await config.hooks.callHook('json:generated', config, schemas)

  return schemas
}
