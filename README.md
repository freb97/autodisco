# 🪩 AutoDisco

[![Github Actions][github-actions-src]][github-actions-href]
[![NPM version][npm-version-src]][npm-version-href]
[![NPM last update][npm-last-update-src]][npm-last-update-href]
[![License][license-src]][license-href]

AutoDisco is a tool for automatic discovery of REST APIs that do not provide an OpenAPI specification themselves.
It generates an OpenAPI schema by inferring request and response structures from user-defined probes.

## Installation

```sh
npm install autodisco
```

## Usage

```ts
import discover from 'autodisco'

await discover({
  baseUrl: 'https://jsonplaceholder.typicode.com',

  probes: {
    get: {
      '/todos': {},
      '/posts': {},

      '/posts/{id}': {
        params: {
          id: 1,
        },
      },

      '/users/{id}': {
        params: {
          id: 1,
        },
      },

      '/comments': {
        query: {
          postId: 1,
        },
      },
    },

    post: {
      '/users': {
        body: {
          name: 'John Doe',
          username: 'johndoe',
          email: 'johndoe@example.com',
        },
      },
    },
  },
})
```

This will create an OpenAPI schema in `autodisco/openapi/schema.json`.

### CLI Usage

You can also use AutoDisco via the command line interface (CLI).
First, create a configuration file, e.g. `autodisco.config.{js,ts,mjs,cjs}`:

```ts
export default {
  baseUrl: 'https://jsonplaceholder.typicode.com',

  probes: {
    get: {
      '/todos': {},
      '/posts': {},
    },
  },
}
```

Then run the `autodisco` command in your terminal:

```sh
npx autodisco
```

This will create an OpenAPI schema in `autodisco/openapi/schema.json`.

### Generating TypeScript Types

If you also want to generate TypeScript types for the probed endpoints, you can enable the `typescript` option in the `generate` configuration:

```ts
import discover from 'autodisco'

await discover({
  baseUrl: 'https://jsonplaceholder.typicode.com',

  probes: {
    get: { '/todos': {} },
  },

  generate: {
    typescript: true,
  },
})
```

This will create TypeScript types in the `autodisco/typescript` directory in addition to the OpenAPI schema:

```
autodisco/
├── openapi/
│   └── schema.json
└── typescript/
    └── types.d.ts
```

> [!NOTE]
> Make sure to install `openapi-typescript` if you want to use TypeScript type generation:
> `npm install openapi-typescript`

### Generating Zod Schemas

If you also want to generate Zod schemas for the probed endpoints, you can enable the `zod` option in the `generate` configuration:

```ts
import discover from 'autodisco'

await discover({
  baseUrl: 'https://jsonplaceholder.typicode.com',

  probes: {
    get: {
      '/todos': {},
    },

    post: {
      '/users': {
        body: {
          name: 'John Doe',
          username: 'johndoe',
          email: 'johndoe@example.com',
        },
      },
    },
  },

  generate: {
    zod: true,
  },
})
```

This will create Zod schemas in the `autodisco/zod` directory in addition to the OpenAPI schema:

```
autodisco/
├── openapi/
│   └── schema.json
└── zod/
    ├── get/
    │   └── Todos.ts
    └── post/
        └── Users.ts
```

> [!NOTE]
> Make sure to install `quicktype-core` if you want to use Zod schema generation:
> `npm install quicktype-core`

## Configuration

The `discover` function accepts a configuration object with the following values:

- `baseUrl`: The base URL for the API (`string`, optional).
- `outputDir`: The directory to output the generated files (`string`, default: `autodisco`).
- `probes`: An object containing endpoints to probe (`ProbeConfig`, required).
- `headers`: An object containing headers to include in all requests (`Record<string, string>, optional`).
- `minify`: Whether to minify the generated OpenAPI schema (`boolean`, default: `false`).
- `clear`: Whether to clear the output directory before generating files (`boolean`, default: `true`).
- `generate`: Options to customize code generation (optional)
  - `zod`: Whether to generate Zod schemas (`boolean | generateZodOptions`, optional).
  - `typescript`: Whether to generate TypeScript types (`boolean | generateTypescriptOptions`, optional).
- `hooks`: Hooks to customize the discovery process (optional).
- `logger`: Custom configuration for the logger ([Consola options](https://github.com/unjs/consola), optional).

### Probe configuration

Each probe can call an endpoint in multiple ways by specifying different combinations of `params`, `query`, and `body`.
Probes supports the following options:

- `params`: An object containing path parameters (optional).
- `query`: An object containing query parameters (optional).
- `body`: An object containing the request body (for POST, PUT, PATCH requests, optional).
- `headers`: An object containing headers to include in the request (optional, overrides default headers).

## Discovery

The discovery process involves sending HTTP requests to the specified endpoints using the provided probes.
The responses are analyzed to infer the structure of the API, which is then used to generate an OpenAPI schema.
If enabled, TypeScript types and Zod schemas are also generated based on the inferred structures.

When all probes are completed, their responses will be converted to Zod schemas at runtime to
ensure an accurate representation of the data structures and to circumvent any serialization issues.
After that, the OpenAPI schema will be generated using the inferred runtime schemas with [zod-openapi](https://github.com/samchungy/zod-openapi)
in the `${outputDir}/openapi` directory.

If TypeScript type generation is enabled, the OpenAPI schema will be converted to TypeScript types
using [openapi-typescript](https://github.com/openapi-ts/openapi-typescript) in the `${outputDir}/typescript` directory.

If Zod schema generation is enabled, additional Zod schemas will be generated as files using [quicktype](https://github.com/quicktype/quicktype)
in the `${outputDir}/zod` directory.

### Schema Inference

The schema inference process breaks a response down by first identifying the primitive data types (string, number, boolean, null)
and then combining them into more complex structures such as arrays and objects.

Arrays are inferred by examining the elements within the array and determining a common schema that encompasses all elements.
If the elements have varying structures, all possible schemas are searched for a common discriminator, such as a shared
property name with different values.
If a common discriminator is found and the number of unique schemas matches the number of available discriminators, the array
will be typed as a discriminated union.
When no common structure can be found, the array is inferred to contain a single object with optional properties representing
all possible fields.

Objects are inferred by analyzing each property and determining its type based on the values present in the responses.
If a property is missing in some responses, it is marked as optional.

### Examples

Given the following responses from probing an endpoint:

```json
{
  "users": [
    { "id": 1, "name": "Alice", "role": "admin", "extra": "data" },
    { "id": 2, "name": "Bob", "role": "user" },
    { "id": 3, "name": "Charlie", "role": "guest" }
  ]
}
```

The inferred schema would be:

```ts
type Response = {
  id: number
  name: string
  role: string
  extra: string | undefined
}[]
```

If the responses were more varied and provide a unique key for each unique kind of schema, the inference
will detect it as a discriminated union such as:

```json
{
  "users": [
    { "id": 1, "name": "Alice", "role": "admin" },
    { "id": 2, "name": "Bob", "role": "editor", "permissions": ["read", "write"] },
    { "id": 3, "name": "Charlie", "role": "guest", "extra": "data" }
  ]
}
```

With the inferred schema being:

```ts
type Response = ({
  id: number
  name: string
  role: 'admin'
} | {
  id: number
  name: string
  role: 'editor'
  permissions: string[]
} | {
  id: number
  name: string
  role: 'guest'
  extra: string
})[]
```

### Hooks Reference

The `hooks` configuration allows you to customize the discovery process by providing functions that are called at specific points during execution.

| Hook Name               | Props                                            | Description                                           |
|-------------------------|--------------------------------------------------|-------------------------------------------------------|
| `discovery:start`       | `config`                                         | Called when the discovery process begins              |
| `probe:request`         | `method`, `path`, `config`                       | Called before each API probe request is made          |
| `probe:response`        | `method`, `path`, `config`, `response`           | Called after each API probe response is received      |
| `probes:completed`      | `config`, `results`                              | Called when all API probing is complete               |
| `zod:generate`          | `method`, `name`, `inputData`, `rendererOptions` | Called before generating Zod schemas using quicktype  |
| `zod:generated`         | `config`                                         | Called after Zod schema files have been generated     |
| `zod:runtime:generate`  | `method`, `path`, `config`, `sample`             | Called before generating runtime Zod schemas          |
| `zod:runtime:generated` | `config`, `results`                              | Called after runtime Zod schemas have been generated  |
| `openapi:generate`      | `config`, `components`, `paths`                  | Called before generating the OpenAPI schema           |
| `openapi:generated`     | `config`, `result`                               | Called after the OpenAPI schema has been generated    |
| `typescript:generate`   | `config`, `openapiTSOptions`                     | Called before generating TypeScript types             |
| `typescript:generated`  | `config`, `result`                               | Called after TypeScript types have been generated     |
| `discovery:completed`   | `config`, `totalTime`, `totalProbingTime`        | Called when the entire discovery process is completed |

## Acknowledgements

This project is heavily inspired by and built with the following libraries:
- [zod-openapi](https://github.com/samchungy/zod-openapi)
- [openapi-typescript](https://github.com/openapi-ts/openapi-typescript)

## 📜 License

Published under the [MIT License](https://github.com/freb97/autodisco/tree/main/LICENSE).

[github-actions-src]: https://github.com/freb97/autodisco/actions/workflows/test.yml/badge.svg
[github-actions-href]: https://github.com/freb97/autodisco/actions

[npm-version-src]: https://img.shields.io/npm/v/autodisco/latest.svg?style=flat&colorA=18181B&colorB=31C553
[npm-version-href]: https://npmjs.com/package/autodisco

[npm-last-update-src]: https://img.shields.io/npm/last-update/autodisco.svg?style=flat&colorA=18181B&colorB=31C553
[npm-last-update-href]: https://npmjs.com/package/autodisco

[license-src]: https://img.shields.io/github/license/freb97/autodisco.svg?style=flat&colorA=18181B&colorB=31C553
[license-href]: https://github.com/freb97/autodisco/tree/main/LICENSE
