import type { IncomingMessage, ServerResponse } from 'node:http'

import { createServer } from 'node:http'

/**
 * Simple test API server that returns static JSON responses
 *
 * @param port Port to run the server on
 *
 * @returns Server instance with start and stop methods and port
 */
export default function createTestAPI(port = 3456) {
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    // Set CORS headers for testing
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json')

    const url = req.url || ''
    const method = req.method || 'GET'

    // GET /users - Array of users
    if (method === 'GET' && url === '/users') {
      res.writeHead(200)
      res.end(JSON.stringify([
        {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          active: true,
        },
        {
          id: 2,
          name: 'Jane Smith',
          email: 'jane@example.com',
          active: false,
        },
      ]))
      return
    }

    // GET /users/{id} - Single user
    if (method === 'GET' && /^\/users\/\d+$/.test(url)) {
      res.writeHead(200)
      res.end(JSON.stringify({
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        active: true,
      }))
      return
    }

    // GET /products - Array of products
    if (method === 'GET' && url === '/products') {
      res.writeHead(200)
      res.end(JSON.stringify([
        {
          id: 'prod-1',
          name: 'Laptop',
          price: 999.99,
          stock: 4,
          tags: ['electronics', 'computers'],
        },
        {
          id: 'prod-2',
          name: 'Mouse',
          price: 29.99,
          stock: 22,
          tags: ['electronics', 'accessories', 'gaming'],
        },
        {
          id: 'prod-3',
          name: 'Keyboard',
          price: 69.99,
          stock: 34,
          tags: ['electronics', 'accessories', 'gaming'],
        },
      ]))
      return
    }

    // GET /empty - Empty response
    if (method === 'GET' && url === '/empty') {
      res.writeHead(200)
      res.end('')
      return
    }

    // GET /facets - Array with two "range" variants (tests discriminated union merging)
    // and a field that is sometimes [] sometimes number (tests union deduplication)
    if (method === 'GET' && url === '/facets') {
      res.writeHead(200)
      res.end(JSON.stringify([
        {
          type: 'ignore',
          counts: [{ count: 5, value: 'red' }],
          field_name: 'color',
          stats: { total_values: 1 },
        },
        {
          type: 'range',
          field_name: 'price',
          stats: { max: 100, min: 0 },
          scores: [],
        },
        {
          type: 'range',
          field_name: 'weight',
          stats: { max: 50, min: 5, total_values: 3 },
          counts: [{ count: 2, value: 'medium' }],
          scores: 15,
        },
      ]))
      return
    }

    // GET /facet-counts - field_name is high-cardinality and appears before type.
    // Discriminator inference should still prefer type over field_name.
    if (method === 'GET' && url === '/facet-counts') {
      res.writeHead(200)
      res.end(JSON.stringify([
        {
          field_name: 'price',
          type: 'range',
          stats: { min: 10, max: 100 },
        },
        {
          field_name: 'stock',
          type: 'range',
          stats: { min: 0, max: 50, total_values: 8 },
          counts: [{ count: 3, value: 'in-stock' }],
        },
        {
          field_name: 'manufacturer',
          type: 'ignore',
          stats: { total_values: 4 },
          counts: [{ count: 2, value: 'acme' }],
        },
      ]))
      return
    }

    // GET /kind-variants - every kind value is unique, but kind should still
    // be a useful discriminator because it is semantically strong.
    if (method === 'GET' && url === '/kind-variants') {
      res.writeHead(200)
      res.end(JSON.stringify([
        {
          kind: 'document',
          found: 10,
          llm: false,
          hits: [{ highlighted: { id: 'p1', type: 'ProductDataType' } }],
        },
        {
          kind: 'facet.a',
          found: 2,
          field_name: 'a',
          hits: [{ highlighted: 'A', count: 2, value: 'A' }],
        },
        {
          kind: 'facet.b',
          found: 3,
          field_name: 'b',
          hits: [{ highlighted: 'B', count: 3, value: 'B' }],
        },
      ]))
      return
    }

    // GET /suggest?q=wireless - Array of suggestions (product | category | searchTerm)[]
    if (method === 'GET' && url.startsWith('/suggest')) {
      res.writeHead(200)
      res.end(JSON.stringify([
        { type: 'product', productId: 'prod-1', name: 'Laptop', price: { currency: 'USD', amount: 999.99 } },
        { type: 'product', productId: 'prod-2', name: 'Mouse', price: { currency: 'USD', amount: 29.99 } },
        { type: 'product', productId: 'prod-3', name: 'Keyboard', price: { currency: 'USD', amount: 69.99 } },
        { type: 'category', categoryId: 'cat-1', name: 'Computers' },
        { type: 'category', categoryId: 'cat-2', name: 'Accessories' },
        { type: 'category', categoryId: 'cat-3', name: 'Keyboards' },
        { type: 'searchTerm', searchTerm: 'wireless mouse' },
        { type: 'searchTerm', searchTerm: 'wireless keyboard' },
        { type: 'searchTerm', searchTerm: 'wireless headset' },
      ]))
      return
    }

    // POST /users - Create user
    if (method === 'POST' && url === '/users') {
      let _body = ''
      req.on('data', (chunk) => {
        _body += chunk.toString()
      })
      req.on('end', () => {
        res.writeHead(201)
        res.end(JSON.stringify({
          id: 3,
          success: true,
          message: 'User created',
        }))
      })
      return
    }

    // 404 for all other routes
    res.writeHead(404)
    res.end(JSON.stringify({ error: 'Not found' }))
  })

  return {
    start: () => new Promise<void>((resolve) => {
      server.listen(port, () => {
        resolve()
      })
    }),

    stop: () => new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err)
          reject(err)
        else resolve()
      })
    }),

    port,
  }
}
