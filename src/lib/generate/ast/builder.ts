import type { ZodASTNode } from './types'

import { z } from 'zod'

/**
 * Recursively converts a runtime Zod schema into an AST node tree.
 *
 * @param schema The Zod schema to convert.
 *
 * @returns The root AST node representing the schema.
 */
export function buildAST(schema: z.ZodType): ZodASTNode {
  if (schema instanceof z.ZodObject) {
    return {
      type: 'object',
      properties: Object.entries(schema.shape).map(([key, value]) => ({
        key,
        value: buildAST(value as z.ZodType),
      })),
    }
  }

  if (schema instanceof z.ZodArray) {
    return {
      type: 'array',
      element: buildAST(schema._zod.def.element as z.ZodType),
    }
  }

  if (schema instanceof z.ZodDiscriminatedUnion) {
    return {
      type: 'union',
      discriminator: schema._zod.def.discriminator,
      options: schema._zod.def.options.map(option => buildAST(option as z.ZodType)),
    }
  }

  if (schema instanceof z.ZodUnion) {
    return {
      type: 'union',
      discriminator: '',
      options: schema._zod.def.options.map(option => buildAST(option as z.ZodType)),
    }
  }

  if (schema instanceof z.ZodOptional) {
    return {
      type: 'optional',
      value: buildAST(schema._zod.def.innerType as z.ZodType),
    }
  }

  if (schema instanceof z.ZodLiteral) {
    return {
      type: 'literal',
      value: String(schema._zod.def.values.at(0)),
    }
  }

  if (schema instanceof z.ZodNull)
    return { type: 'null' }
  if (schema instanceof z.ZodString)
    return { type: 'string' }
  if (schema instanceof z.ZodNumber)
    return { type: 'number' }
  if (schema instanceof z.ZodBoolean)
    return { type: 'boolean' }

  return { type: 'unknown' }
}
