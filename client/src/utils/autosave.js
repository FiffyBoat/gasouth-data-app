/**
 * @module utils/autosave
 * @description Provides form-state persistence via localStorage with
 * automatic expiration (24 hours).
 */

const AUTOSAVE_PREFIX = 'zebra_rms_form_';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Persists form state to localStorage with a timestamp.
 * @param {string} formId - Unique identifier for the form instance
 * @param {Object} data - Form data to persist
 */
export function saveFormState(formId, data) {
  try {
    const payload = {
      data,
      savedAt: Date.now(),
    };
    localStorage.setItem(AUTOSAVE_PREFIX + formId, JSON.stringify(payload));
  } catch (err) {
    console.warn('[Autosave] Failed to save form state:', err.message);
  }
}

/**
 * Loads previously saved form state from localStorage.
 * Returns null if the saved state is older than 24 hours or does not exist.
 * @param {string} formId - Unique identifier for the form instance
 * @returns {Object|null} The saved form data, or null
 */
export function loadFormState(formId) {
  try {
    const raw = localStorage.getItem(AUTOSAVE_PREFIX + formId);
    if (!raw) return null;

    const payload = JSON.parse(raw);
    if (Date.now() - payload.savedAt > MAX_AGE_MS) {
      clearFormState(formId);
      return null;
    }
    return payload.data;
  } catch (err) {
    console.warn('[Autosave] Failed to load form state:', err.message);
    return null;
  }
}

/**
 * Removes a saved form state from localStorage.
 * @param {string} formId - Unique identifier for the form instance
 */
export function clearFormState(formId) {
  try {
    localStorage.removeItem(AUTOSAVE_PREFIX + formId);
  } catch (err) {
    console.warn('[Autosave] Failed to clear form state:', err.message);
  }
}

/**
 * Lists all saved form IDs (useful for debugging / cleanup).
 * @returns {string[]} Array of form IDs with saved state
 */
export function listSavedForms() {
  const ids = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(AUTOSAVE_PREFIX)) {
      ids.push(key.replace(AUTOSAVE_PREFIX, ''));
    }
  }
  return ids;
}
