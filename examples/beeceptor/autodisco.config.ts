export default {
  baseUrl: 'https://json-placeholder.mock.beeceptor.com',

  headers: {
    'X-Custom-Header': 'MyCustomValue',
  },

  probes: {
    get: {
      '/roles': {},
      '/posts': {},

      '/posts/{id}': {
        headers: {
          'X-Test': 'MyTestValue123',
        },
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
      '/login': {
        body: {
          username: "michael",
          password: "success-password"
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
