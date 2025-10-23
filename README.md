# AutoDisco

[![Github Actions][github-actions-src]][github-actions-href]
[![NPM version][npm-version-src]][npm-version-href]
[![NPM last update][npm-last-update-src]][npm-last-update-href]
[![License][license-src]][license-href]

🪩 Use legacy APIs with confidence

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

This will create an OpenAPI schema in `.autodisco/openapi/schema.json`.

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

This will create TypeScript types in the `.autodisco/typescript` directory in addition to the OpenAPI schema:

```
.autodisco/
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

This will create Zod schemas in the `.autodisco/zod` directory in addition to the OpenAPI schema:

```
.autodisco/
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
- `outputDir`: The directory to output the generated files (`string`, default: `.autodisco`).
- `probes`: An object containing endpoints to probe (`ProbeConfig`, required).
- `headers`: An object containing headers to include in all requests (`Record<string, string>, optional`).
- `minify`: Whether to minify the generated OpenAPI schema (`boolean`, default: `false`).
- `clear`: Whether to clear the output directory before generating files (`boolean`, default: `true`).
- `logger`: Custom configuration for the logger ([Consola options](https://github.com/unjs/consola), optional).
- `generate`: Options to customize code generation (optional)
  - `zod`: Whether to generate Zod schemas (`boolean | generateZodOptions`, optional).
  - `typescript`: Whether to generate TypeScript types (`boolean | generateTypescriptOptions`, optional).

### Probe configuration

Each probe can call an endpoint in multiple ways by specifying different combinations of `params`, `query`, and `body`.
Probes supports the following options:

- `params`: An object containing path parameters (optional).
- `query`: An object containing query parameters (optional).
- `body`: An object containing the request body (for POST, PUT, PATCH requests, optional).
- `headers`: An object containing headers to include in the request (optional, overrides default headers).

## Acknowledgements

This project is heavily inspired by and built with the following libraries:
- [zod-openapi](https://github.com/samchungy/zod-openapi)
- [openapi-typescript](https://github.com/openapi-ts/openapi-typescript)
- [quicktype](https://github.com/glideapps/quicktype)

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
