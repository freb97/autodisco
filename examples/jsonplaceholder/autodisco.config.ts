export default {
  baseUrl: 'https://jsonplaceholder.typicode.com',

  headers: {
    'X-Custom-Header': 'MyCustomValue',
  },

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
        headers: {
          'X-Test': 'MyTestValue123',
        },
        body: {
          name: 'John Doe',
          username: 'johndoe',
          email: 'johndoe@example.com',
        },
      },
    },
  },

  generate: {
    openapi: {
      typescript: true,
    },
    typescript: true,
    json: true,
    zod: true,
    markdown: true,
  },
}
