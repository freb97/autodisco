import discover from './dist/index.mjs'

await discover({
  baseUrl: 'https://jsonplaceholder.typicode.com',

  probes: {
    get: {
      '/todos/{id}': {
        params: {
          id: 1,
        },
      },

      '/comments': {
        query: {
          postId: 1,
        },
      },

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
    },

    post: {
      '/posts': {
        body: {
          userId: 1,
          title: 'foo',
          body: 'bar',
        },
      },
    },
  },
})
