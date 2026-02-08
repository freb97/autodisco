import type { ObjectProperty, ZodASTNode } from './types'

type Language = 'typescript' | 'zod'

const pad = (indent: string, depth: number): string => indent.repeat(depth)

function writeString(lang: Language): string {
  return lang === 'zod' ? 'z.string()' : 'string'
}

function writeNumber(lang: Language): string {
  return lang === 'zod' ? 'z.number()' : 'number'
}

function writeBoolean(lang: Language): string {
  return lang === 'zod' ? 'z.boolean()' : 'boolean'
}

function writeNull(lang: Language): string {
  return lang === 'zod' ? 'z.null()' : 'null'
}

function writeUnknown(lang: Language): string {
  return lang === 'zod' ? 'z.unknown()' : 'unknown'
}

function writeLiteral(value: string, lang: Language): string {
  return lang === 'zod' ? `z.literal("${value}")` : `"${value}"`
}

function writeOptional(
  element: ZodASTNode,
  depth: number,
  lang: Language,
  indent: string,
): string {
  return `${writeNode(element, depth, lang, indent)}${lang === 'zod' ? '.optional()' : ' | undefined'}`
}

function writeObject(
  properties: ObjectProperty[],
  depth: number,
  lang: Language,
  indent: string,
): string {
  const inner = depth + 1
  const props = properties
    .map(({ key, value }) => `${pad(indent, inner)}"${key}": ${writeNode(value, inner, lang, indent)}`)
    .join(`${lang === 'zod' ? ',' : ''}\n`)

  return lang === 'zod'
    ? `z.object({\n${props}\n${pad(indent, depth)}})`
    : `{\n${props}\n${pad(indent, depth)}}`
}

function writeArray(element: ZodASTNode, depth: number, lang: Language, indent: string): string {
  return lang === 'zod'
    ? `z.array(${writeNode(element, depth, lang, indent)})`
    : `${writeNode(element, depth, lang, indent)}[]`
}

function writeUnion(
  discriminator: string,
  options: ZodASTNode[],
  depth: number,
  lang: Language,
  indent: string,
): string {
  const inner = lang === 'zod' ? depth + 1 : depth
  const opts = options
    .map(option => (lang === 'zod' ? pad(indent, inner) : '') + writeNode(option, inner, lang, indent))
    .join(lang === 'zod' ? ',\n' : ' | ')

  return lang === 'zod'
    ? discriminator.length > 0
      ? `z.discriminatedUnion("${discriminator}", [\n${opts}\n${pad(indent, depth)}])`
      : `z.union([\n${opts}\n${pad(indent, depth)}])`
    : `(${opts}${pad(indent, depth)})`
}

function writeNode(node: ZodASTNode, depth: number, lang: Language, indent: string): string {
  switch (node.type) {
    case 'string':
      return writeString(lang)
    case 'number':
      return writeNumber(lang)
    case 'boolean':
      return writeBoolean(lang)
    case 'null':
      return writeNull(lang)
    case 'unknown':
      return writeUnknown(lang)
    case 'literal':
      return writeLiteral(node.value, lang)
    case 'optional':
      return writeOptional(node.value, depth, lang, indent)
    case 'object':
      return writeObject(node.properties, depth, lang, indent)
    case 'array':
      return writeArray(node.element, depth, lang, indent)
    case 'union':
      return writeUnion(node.discriminator, node.options, depth, lang, indent)
  }
}

/**
 * Creates a writer function that converts a Zod AST node tree into
 * a formatted source-code string.
 *
 * @param options Writer configuration
 * @param options.lang Language of the output ('typescript' or 'zod')
 * @param options.indent String used for indentation
 *
 * @returns A function that serialises an AST node to source code.
 */
export function createWriter(options?: { lang?: 'typescript' | 'zod', indent?: string }): (node: ZodASTNode) => string {
  const lang = options?.lang ?? 'zod'
  const indent = options?.indent ?? '  '

  return (node: ZodASTNode) => writeNode(node, 0, lang, indent)
}

/**
 * Serialises a Zod AST node to source code using default options.
 */
export function writeAST(node: ZodASTNode, options?: { lang?: 'typescript' | 'zod', indent?: string }) {
  return createWriter(options)(node)
}
