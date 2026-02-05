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
    schema: result.schema,
  }))

  await config.hooks.callHook('json:generate', config, components)

  const schemas = components.map(({ name, schema }) => ({
    name,
    schema: JSON.stringify(schema.toJSONSchema(), undefined, config.minify ? 0 : 2),
  }))

  await mkdir(joinURL(config.outputDir, 'json'), { recursive: true }).then(() =>
    Promise.all(schemas.map(async ({ name, schema }) =>
      writeFile(joinURL(config.outputDir, 'json', `${name}.json`), schema))))

  await config.hooks.callHook('json:generated', config, schemas)
}
