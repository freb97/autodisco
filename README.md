# AutoDisco

🪩 Use legacy APIs with confidence

AutoDisco is a tool for using legacy REST APIs with typed inputs and responses.
It automatically generates OpenAPI and Zod schemas by probing the endpoints to help
developers navigate and understand the API faster.

```ts
import discover from 'autodisco'

await discover({
  baseUrl: 'https://jsonplaceholder.typicode.com',

  probes: {
    '/todos/:id': {
      params: {
        id: 1,
      },
    },

    '/posts/:id': {
      params: {
        id: 1,
      },
    },

    '/users/:id': {
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
})
```

Will generate:

- `.generated/zod/*.ts` - Zod schemas for request and response validation
- `.generated/openapi/schema.json` - OpenAPI schema of the discovered endpoints
