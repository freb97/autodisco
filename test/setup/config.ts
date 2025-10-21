import { randomBytes } from 'node:crypto'

export function getTestBaseConfig() {
  return {
    baseUrl: 'http://localhost:3456',
    outputDir: `test/.outputs/${randomBytes(8).toString('hex')}`,
  }
}
