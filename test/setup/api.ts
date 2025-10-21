import createTestAPI from '../fixture/api'

let api: ReturnType<typeof createTestAPI>

export async function setup() {
  api = createTestAPI()

  await api.start()
}

export async function teardown() {
  if (api) {
    await api.stop()
  }
}
