import { z } from 'zod'

/**
 * Converts a ZodObject to a string representation of its schema.
 *
 * @param value The ZodObject to convert.
 *
 * @returns A string representation of the ZodObject schema.
 */
export function zodObjectToString(value: z.ZodObject) {
  const properties: string = Object.entries(value.shape).map(([key, val]) => {
    return `  "${key}": ${zodToString(val)}`
  }).join(',\n')

  return `z.object({\n${properties}\n})`
}

/**
 * Converts a ZodArray to a string representation of its schema.
 *
 * @param value The ZodArray to convert.
 *
 * @returns A string representation of the ZodArray schema.
 */
export function zodArrayToString(value: z.ZodArray): string {
  const elementSchema = value._zod.def.element
  return `z.array(${zodToString(elementSchema as any)})`
}

/**
 * Converts a ZodUnion to a string representation of its schema.
 *
 * @param value The ZodUnion to convert.
 *
 * @returns A string representation of the ZodUnion schema.
 */
export function zodUnionToString(value: z.ZodUnion): string {
  const options: string = value._zod.def.options.map((option: any) => {
    return zodToString(option as z.ZodType)
  }).join(', ')

  return `z.discriminatedUnion("type", [${options}])`
}

/**
 * Converts a ZodType to a string representation of its schema.
 *
 * @param value The ZodType to convert.
 *
 * @returns A string representation of the ZodType schema.
 */
export function zodToString(value: z.ZodType) {
  if (value instanceof z.ZodNull) {
    return 'z.null()'
  }

  if (value instanceof z.ZodObject) {
    return zodObjectToString(value)
  }

  if (value instanceof z.ZodArray) {
    return zodArrayToString(value)
  }

  if (value instanceof z.ZodUnion) {
    return zodUnionToString(value)
  }

  if (value instanceof z.ZodLiteral) {
    return `z.literal("${value._zod.def.values.at(0)}")`
  }

  if (value instanceof z.ZodString)
    return 'z.string()'
  if (value instanceof z.ZodNumber)
    return 'z.number()'
  if (value instanceof z.ZodBoolean)
    return 'z.boolean()'

  return 'z.unknown()'
}
