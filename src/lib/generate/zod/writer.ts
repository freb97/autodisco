import type { ObjectProperty, ZodASTNode } from './ast'

const pad = (indent: string, depth: number): string => indent.repeat(depth)

function writeLiteral(value: string): string {
  return `z.literal("${value}")`
}

function writeObject(
  properties: ObjectProperty[],
  depth: number,
  indent: string,
): string {
  const inner = depth + 1
  const props = properties
    .map(({ key, value }) => `${pad(indent, inner)}"${key}": ${writeNode(value, inner, indent)}`)
    .join(',\n')

  return `z.object({\n${props}\n${pad(indent, depth)}})`
}

function writeArray(element: ZodASTNode, depth: number, indent: string): string {
  return `z.array(${writeNode(element, depth, indent)})`
}

function writeUnion(
  discriminator: string,
  options: ZodASTNode[],
  depth: number,
  indent: string,
): string {
  const inner = depth + 1
  const opts = options
    .map(option => pad(indent, inner) + writeNode(option, inner, indent))
    .join(',\n')

  return `z.discriminatedUnion("${discriminator}", [\n${opts}\n${pad(indent, depth)}])`
}

function writeNode(node: ZodASTNode, depth: number, indent: string): string {
  switch (node.type) {
    case 'string':
      return 'z.string()'
    case 'number':
      return 'z.number()'
    case 'boolean':
      return 'z.boolean()'
    case 'null':
      return 'z.null()'
    case 'unknown':
      return 'z.unknown()'
    case 'literal':
      return writeLiteral(node.value)
    case 'object':
      return writeObject(node.properties, depth, indent)
    case 'array':
      return writeArray(node.element, depth, indent)
    case 'union':
      return writeUnion(node.discriminator, node.options, depth, indent)
  }
}

/**
 * Creates a writer function that converts a Zod AST node tree into
 * a formatted source-code string.
 *
 * @param options Writer configuration
 * @param options.indent String used for indentation
 *
 * @returns A function that serialises an AST node to source code.
 */
export function createWriter(options?: { indent?: string }): (node: ZodASTNode) => string {
  const indent = options?.indent ?? '  '

  return (node: ZodASTNode) => writeNode(node, 0, indent)
}

/**
 * Serialises a Zod AST node to source code using default options.
 */
export const writeAST = createWriter()
