import type { ParsedDiscoverConfig, SchemaResult } from '../config'

import { mkdir, writeFile } from 'node:fs/promises'
import { joinURL } from 'ufo'

import { resolveTypeName } from '../../helpers/path'

/**
 * Generate JSON schema from Zod schema results
 *
 * @param schemaResults Array of schema results
 * @param config Parsed discovery configuration
 *
 * @return Generated JSON schema as string
 */
export async function generateJsonSchema(schemaResults: SchemaResult[], config: ParsedDiscoverConfig) {
  if (!config.generate?.json) {
    return
  }

  const components = schemaResults.map(result => ({
    name: resolveTypeName(result.path),
    method: result.method,
    schema: result.schema,
  }))

  await config.hooks.callHook('json:generate', config, components)

  const schemas = components.map(({ schema, ...rest }) => ({
    schema: JSON.stringify(schema.toJSONSchema(), undefined, config.minify ? 0 : 2),
    ...rest,
  }))

  await Promise.all(schemas.map(async ({ name, method, schema }) =>
    mkdir(joinURL(config.outputDir, 'json', method), { recursive: true }).then(() =>
      writeFile(joinURL(config.outputDir, 'json', method, `${name}.json`), schema))))

  await config.hooks.callHook('json:generated', config, schemas)
}
