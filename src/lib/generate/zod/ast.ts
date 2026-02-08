export interface StringNode {
  type: 'string'
}

export interface NumberNode {
  type: 'number'
}

export interface BooleanNode {
  type: 'boolean'
}

export interface NullNode {
  type: 'null'
}

export interface UnknownNode {
  type: 'unknown'
}

export interface LiteralNode {
  type: 'literal'
  value: string
}

export interface ObjectNode {
  type: 'object'
  properties: ObjectProperty[]
}

export interface ObjectProperty {
  key: string
  value: ZodASTNode
}

export interface ArrayNode {
  type: 'array'
  element: ZodASTNode
}

export interface UnionNode {
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
    | ObjectNode
    | ArrayNode
    | UnionNode
