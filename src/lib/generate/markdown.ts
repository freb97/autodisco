import type { SchemaResult } from '../../types'
import type { ParsedDiscoverConfig } from '../config'

import { writeFile } from 'node:fs/promises'
import { joinURL } from 'ufo'

import { resolveTypeName } from '../../helpers/path'

/**
 * Generate Markdown file from parsed schema results
 *
 * @param schemaResults Array of schema results
 * @param config Parsed discovery configuration
 */
export async function generateMarkdownSchema(schemaResults: SchemaResult[], typescriptResult: string | undefined, zodResults: any, jsonResults: any, config: ParsedDiscoverConfig) {
  if (!config.generate?.markdown) {
    return
  }

  const components = schemaResults.map(result => ({
    name: resolveTypeName(joinURL(config.baseUrl ?? '', result.path)),
    method: result.method,
    schema: result.schema,
  }))

  const _schemas = await Promise.all(components.map(async ({ schema, ...rest }) => {
    await config.hooks.callHook('markdown:generate', config, rest.method, rest.name, schema)

    return {
      schema,
      ...rest,
    }
  }))

  const markdownDocument = `# API Documentation\n`

  await writeFile(joinURL(config.outputDir, 'API.md'), markdownDocument)

  await config.hooks.callHook('markdown:generated', config, markdownDocument)

  return markdownDocument
}
