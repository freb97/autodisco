import type { ParsedDiscoverConfig } from '../lib/config'

import { createConsola } from 'consola'

export function useLogger(config: ParsedDiscoverConfig['logger']) {
  return createConsola(config)
}
