import { randomBytes } from 'node:crypto'
import { inject } from 'vitest'

export function getTestBaseConfig() {
  const apiPort = inject('apiPort')

  return {
    baseUrl: `http://localhost:${apiPort}`,
    outputDir: `test/.outputs/${randomBytes(8).toString('hex')}`,
  }
}
