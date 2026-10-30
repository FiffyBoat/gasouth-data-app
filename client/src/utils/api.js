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

/* ---------- Request interceptor: attach JWT ---------- */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('zebra_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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

export default api;
