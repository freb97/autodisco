interface StringNode {
  type: 'string'
}

interface NumberNode {
  type: 'number'
}

interface BooleanNode {
  type: 'boolean'
}

interface NullNode {
  type: 'null'
}

interface UnknownNode {
  type: 'unknown'
}

interface LiteralNode {
  type: 'literal'
  value: string
}

interface OptionalNode {
  type: 'optional'
  value: ZodASTNode
}

interface ObjectNode {
  type: 'object'
  properties: ObjectProperty[]
}

export interface ObjectProperty {
  key: string
  value: ZodASTNode
}

interface ArrayNode {
  type: 'array'
  element: ZodASTNode
}

interface UnionNode {
  type: 'union'
  discriminator: string
  options: ZodASTNode[]
}

export type ZodASTNode
  = | StringNode
    | NumberNode
    | BooleanNode
    | NullNode
    | UnknownNode
    | LiteralNode
    | OptionalNode
    | ObjectNode
    | ArrayNode
    | UnionNode
