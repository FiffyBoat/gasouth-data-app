/**
 * @module hooks/useApi
 * @description Convenience hook that exposes the shared Axios instance
 * through React. Provides get/post/put/patch/delete helpers that
 * automatically include the JWT token.
 */

import { useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { get, post, put, patch, del, upload } from '../utils/api';

/**
 * Hook providing authenticated API methods.
 * @returns {{ get, post, put, patch, del, upload, api }}
 */
export default function useApi() {
  return useMemo(
    () => ({ get, post, put, patch, del, upload, api }),
    []
  );
}
