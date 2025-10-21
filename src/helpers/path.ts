import type { ProbeConfig } from '../lib/config'

import { normalizeURL, withLeadingSlash, withoutLeadingSlash, withoutTrailingSlash, withQuery } from 'ufo'

/**
 * Resolve the full path for a given endpoint and probe configuration
 *
 * @param path The endpoint path
 * @param config The probe configuration
 *
 * @returns The resolved full path
 */
export function resolvePath(path: string, config: ProbeConfig): string {
  let resolvedPath = path

  if (config.params) {
    for (const [key, value] of Object.entries(config.params)) {
      resolvedPath = resolvedPath.replace(`{${key}}`, encodeURIComponent(value))
    }
  }

  if (config.query) {
    resolvedPath = withQuery(resolvedPath, config.query)
  }

  return normalizeURL(withLeadingSlash(withoutTrailingSlash(resolvedPath)))
}

/**
 * Resolve a type name from a given path
 *
 * @param path The endpoint path
 *
 * @returns The resolved type name
 */
export function resolveTypeName(path: string) {
  let resolvedPath = path

  resolvedPath = withoutLeadingSlash(withoutTrailingSlash(
    resolvedPath
      .replaceAll(/\{[^}]+\}/g, '') // Remove params, e.g., /auth/users/{id} -> /auth/users/
      .split('?')[0], // Remove query, e.g., /auth/users/?active=true -> /auth/users/
  ))

  // Convert to camel case, e.g., auth/users -> AuthUsers
  resolvedPath = resolvedPath
    .split('/')
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('')

  return resolvedPath
}
