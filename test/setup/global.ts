import type { TestProject } from 'vitest/node'

import { rm } from 'node:fs/promises'

import createTestAPI from './fixture/api'

export default async function setup(project: TestProject) {
  const api = createTestAPI()

  await api.start()

  project.provide('apiPort', api.port)

  return async function teardown() {
    await api.stop()

    await rm('test/.outputs', { recursive: true, force: true })
  }
}
