import { useCallback } from 'react'
import { api as rawApi, UnauthorizedError } from './api'
import { useAuth } from './AuthContext'

// Wraps the raw api() call so a 401 anywhere in the app drops the user back
// to the login screen instead of leaving a page stuck on "Loading…".
export function useApi() {
  const { forceSignOut } = useAuth()

  return useCallback(
    async (path, opts) => {
      try {
        return await rawApi(path, opts)
      } catch (err) {
        if (err instanceof UnauthorizedError) forceSignOut()
        throw err
      }
    },
    [forceSignOut],
  )
}
