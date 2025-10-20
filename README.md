# AutoDisco

🪩 Use legacy APIs with confidence

AutoDisco is a tool for automatic discovery of REST APIs that do not provide an OpenAPI specification.
It generates Zod schemas by probing the endpoints and inferring their structure.
From the discovered schemas, an OpenAPI specification is generated for easy access.

> [!NOTE]
> AutoDisco is in early development. It may not work perfectly for all APIs and use cases.

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
      '/todos': true,
      '/posts': true,

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

This will create the following files:

- `.autodisco/zod`
  - `todos.get.ts`
  - `posts.get.ts`
  - `users.get.ts`
  - `comments.get.ts`
  - `users.post.ts`
- `.autodisco/openapi/schema.json`

## Configuration

The `discover` function accepts a configuration object with the following options:

- `baseUrl`: The base URL for the API (required).
- `outputDir`: The directory to output the generated files (default: `.autodisco`).
- `probes`: An object containing the endpoints to probe (required).
- `headers`: An object containing headers to include in all requests.
- `minify`: Whether to minify the generated OpenAPI schema (default: `false`).
- `clear`: Whether to clear the output directory before generating files (default: `true`).
- `logger`: Custom configuration for the logger ([Consola options](https://github.com/unjs/consola)).

### Probes

Each probe can call an endpoint in multiple ways by specifying different combinations of `params`, `query`, and `body`.
Probes supports the following options:

- `method`: The HTTP method to use (default: `GET`).
- `params`: An object containing path parameters.
- `query`: An object containing query parameters.
- `body`: An object containing the request body (for POST, PUT, PATCH requests).
- `headers`: An object containing headers to include in the request (overrides default headers).

## Acknowledgements

This project is inspired by and built upon the following libraries:
- [quicktype](https://quicktype.io/)
- [zod-openapi](https://github.com/samchungy/zod-openapi)
