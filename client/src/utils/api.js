/**
 * @module utils/api
 * @description Configured Axios instance with JWT auth headers and
 * automatic 401 redirect. All API calls should use this instance.
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Pre-configured Axios instance for the Zebra RMS API.
 * Automatically attaches the JWT token from localStorage and handles
 * 401 responses by clearing auth state and redirecting to login.
 */
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

/* ---------- Request interceptor: attach JWT & handle FormData ---------- */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('zebra_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // When sending FormData, remove Content-Type so browser auto-sets multipart/form-data WITH boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ---------- Response interceptor: handle 401 ---------- */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('zebra_token');
      localStorage.removeItem('zebra_user');
      // Only redirect if we're not already on the login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/* ---------- Helper functions ---------- */

/**
 * GET request helper.
 * @param {string} url - Endpoint path
 * @param {Object} [params] - Query parameters
 * @returns {Promise} Axios response
 */
export const get = (url, params) => api.get(url, { params });

/**
 * POST request helper.
 * @param {string} url - Endpoint path
 * @param {Object} data - Request body
 * @param {Object} [config] - Extra Axios config
 * @returns {Promise} Axios response
 */
export const post = (url, data, config) => api.post(url, data, config);

/**
 * PUT request helper.
 * @param {string} url - Endpoint path
 * @param {Object} data - Request body
 * @returns {Promise} Axios response
 */
export const put = (url, data) => api.put(url, data);

/**
 * PATCH request helper.
 * @param {string} url - Endpoint path
 * @param {Object} data - Partial update body
 * @returns {Promise} Axios response
 */
export const patch = (url, data) => api.patch(url, data);

/**
 * DELETE request helper.
 * @param {string} url - Endpoint path
 * @returns {Promise} Axios response
 */
export const del = (url) => api.delete(url);

/**
 * Upload helper for multipart/form-data (photos).
 * @param {string} url - Endpoint path
 * @param {FormData} formData - FormData containing the file(s)
 * @param {Function} [onProgress] - Upload progress callback (0-100)
 * @returns {Promise} Axios response
 */
export const upload = (url, formData, onProgress) =>
  api.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });

/**
 * Resolves a photo path to a full accessible URL.
 * Handles relative '/uploads/...', remote CDN URLs, and local blob URLs.
 * @param {string} filePath - Path from database (e.g. '/uploads/abc.jpg')
 * @returns {string} Fully resolved photo URL
 */
export function getPhotoUrl(filePath) {
  if (!filePath) return '';
  if (
    filePath.startsWith('http://') ||
    filePath.startsWith('https://') ||
    filePath.startsWith('blob:') ||
    filePath.startsWith('data:')
  ) {
    return filePath;
  }
  const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
  const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  return `${baseUrl}${cleanPath}`;
}

export const PHOTO_PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400' fill='%23f1f5f9'><rect width='400' height='400' fill='%23f8fafc'/><path d='M140 180a40 40 0 1080 0 40 40 0 00-80 0zm140 100H120l50-65 35 45 45-60 30 40z' fill='%2394a3b8'/><text x='50%25' y='82%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' font-weight='600' fill='%2364748b'>GSMA Field Photo</text></svg>";

export default api;
