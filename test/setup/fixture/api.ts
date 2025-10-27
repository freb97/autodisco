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
    if (method === 'GET' && url.match(/^\/users\/\d+$/)) {
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
