import type { ProbeConfig } from '../lib/config'

import { joinURL, normalizeURL, withLeadingSlash, withoutLeadingSlash, withoutTrailingSlash, withQuery } from 'ufo'

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
    // Replace path parameters with their values, e.g., /users/{id} -> /users/1
    for (const [key, value] of Object.entries(config.params)) {
      resolvedPath = resolvedPath.replace(`{${key}}`, encodeURIComponent(value))
    }
  }

  // Append query parameters if present, e.g., /users -> /users?active=true
  if (config.query) {
    resolvedPath = withQuery(resolvedPath, config.query)
  }

  return normalizeURL(withLeadingSlash(withoutTrailingSlash(resolvedPath)))
}

/**
 * Resolve a type name from a given path
 *
 * @param path The endpoint path
 * @param options Resolution options
 * @param options.keepParams Keep path parameter names instead of dropping them,
 * e.g., /auth/users/{id} -> AuthUsersId instead of AuthUsers. Used to disambiguate
 * names that would otherwise collide.
 *
 * @returns The resolved type name
 */
function resolveTypeName(path: string, options?: { keepParams?: boolean }) {
  let resolvedTypeName = path

  resolvedTypeName = withoutLeadingSlash(withoutTrailingSlash(
    resolvedTypeName
      .replaceAll(/^https?:\/\/[^/]+/g, '') // Remove URL origin, e.g., https://api.example.com/customer.test/auth/users/ -> /customer.test/auth/users/
      .replaceAll(/\/[^/]*\.[^/]*/g, '') // Remove dot-containing segments, e.g., /customer.test/auth/users/ -> /auth/users/
      .replaceAll(/\{([^}]+)\}/g, options?.keepParams ? '$1' : '') // Params, e.g., /auth/users/{id} -> /auth/users/ (or /auth/users/id)
      .replaceAll(/[-_]+/g, '/') // Remove dashes and underscores, e.g., /auth/user-profile/ -> /auth/user/profile/
      .split('?')[0] ?? '', // Remove query, e.g., /auth/users/?active=true -> /auth/users/
  ))

  // Convert to camel case, e.g., auth/users -> AuthUsers
  resolvedTypeName = resolvedTypeName
    .split('/')
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('')

  return resolvedTypeName || 'Root'
}

/**
 * Resolve a unique type name for every endpoint.
 *
 * Distinct paths can resolve to the same type name (e.g. `/users` and `/users/{id}`
 * both resolve to `Users`). Names are only required to be unique per HTTP method,
 * since generated files are grouped into per-method directories and OpenAPI
 * component names are prefixed with the method.
 *
 * @param endpoints Endpoints to resolve names for
 * @param baseUrl Base URL the endpoint paths are relative to
 *
 * @returns Map of `${method} ${path}` to the resolved unique type name
 */
export function resolveTypeNames(endpoints: { method: string, path: string }[], baseUrl?: string) {
  const names = new Map<string, string>()
  const taken = new Map<string, Set<string>>()

  for (const { method, path } of endpoints) {
    const fullPath = joinURL(baseUrl ?? '', path)

    if (!taken.has(method)) {
      taken.set(method, new Set())
    }

    const takenForMethod = taken.get(method)!

    let name = resolveTypeName(fullPath)

    if (takenForMethod.has(name)) {
      const specificName = resolveTypeName(fullPath, { keepParams: true })

      name = specificName

      for (let suffix = 2; takenForMethod.has(name); suffix++) {
        name = `${specificName}${suffix}`
      }
    }

    takenForMethod.add(name)
    names.set(`${method} ${path}`, name)
  }

  return names
}
