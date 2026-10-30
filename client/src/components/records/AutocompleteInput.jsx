import React, { useState, useRef, useEffect, useMemo } from 'react';

const STORAGE_KEY_PREFIX = 'zebra_autocomplete_';

/**
 * AutocompleteInput — a free-text input that learns from previously entered
 * values and suggests them as a dropdown while the user types.
 *
 * Suggestions are persisted per-field in localStorage so they survive reloads
 * and accumulate over time as more records are captured.
 */
export default function AutocompleteInput({
  fieldKey,
  value,
  onChange,
  placeholder = '',
  required = false,
  className = '',
  label,
  error,
}) {
  const [focused, setFocused] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Load saved suggestions from localStorage
  const savedSuggestions = useMemo(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREFIX + fieldKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, [fieldKey]);

  // Filter suggestions based on current input
  const filteredSuggestions = useMemo(() => {
    if (!value || value.trim().length === 0) return savedSuggestions.slice(0, 8);
    const term = value.toLowerCase().trim();
    return savedSuggestions
      .filter((s) => s.toLowerCase().includes(term) && s.toLowerCase() !== term)
      .slice(0, 8);
  }, [value, savedSuggestions]);

  const showDropdown = focused && filteredSuggestions.length > 0;

  // Persist a new value into the suggestion bank (deduped, most recent first)
  const persistValue = (val) => {
    if (!val || val.trim().length < 2) return;
    const trimmed = val.trim();
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREFIX + fieldKey);
      let list = stored ? JSON.parse(stored) : [];
      // Remove existing duplicate (case-insensitive)
      list = list.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
      // Add to front
      list.unshift(trimmed);
      // Keep max 50 unique suggestions
      if (list.length > 50) list = list.slice(0, 50);
      localStorage.setItem(STORAGE_KEY_PREFIX + fieldKey, JSON.stringify(list));
    } catch {
      // Silent fail
    }
  };

  const handleSelect = (suggestion) => {
    onChange(suggestion);
    setFocused(false);
    setHighlightIndex(-1);
    inputRef.current?.blur();
  };

  const handleBlur = () => {
    // Small delay so click on suggestion registers before dropdown hides
    setTimeout(() => {
      setFocused(false);
      setHighlightIndex(-1);
      // Persist the current value when user leaves the field
      if (value && value.trim().length >= 2) {
        persistValue(value);
      }
    }, 180);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev > 0 ? prev - 1 : filteredSuggestions.length - 1
      );
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(filteredSuggestions[highlightIndex]);
    } else if (e.key === 'Escape') {
      setFocused(false);
      setHighlightIndex(-1);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setFocused(false);
        setHighlightIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="block text-xs font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        type="text"
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setHighlightIndex(-1);
        }}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        className={
          className ||
          `w-full px-3 py-2 border rounded-xl text-sm focus:ring-1 focus:outline-none ${
            error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-primary-500'
          }`
        }
      />
      {error && <p className="text-xs text-red-600 mt-1 font-medium">{error}</p>}

      {showDropdown && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filteredSuggestions.map((suggestion, idx) => {
            // Highlight the matching portion
            const lowerSugg = suggestion.toLowerCase();
            const lowerVal = (value || '').toLowerCase().trim();
            const matchStart = lowerSugg.indexOf(lowerVal);

            return (
              <button
                key={idx}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(suggestion);
                }}
                className={`w-full px-3 py-2 text-left text-xs transition-colors flex items-center gap-2 ${
                  idx === highlightIndex
                    ? 'bg-primary-50 text-primary-800'
                    : 'text-gray-700 hover:bg-gray-50'
                } ${idx === 0 ? 'rounded-t-xl' : ''} ${
                  idx === filteredSuggestions.length - 1 ? 'rounded-b-xl' : ''
                }`}
              >
                <span className="text-gray-400 text-[10px]">↩</span>
                {matchStart >= 0 && lowerVal.length > 0 ? (
                  <span>
                    {suggestion.slice(0, matchStart)}
                    <strong className="text-primary-700 font-bold">
                      {suggestion.slice(matchStart, matchStart + lowerVal.length)}
                    </strong>
                    {suggestion.slice(matchStart + lowerVal.length)}
                  </span>
                ) : (
                  <span>{suggestion}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Utility: seed initial suggestions for a field so the dropdown isn't empty
 * on first use. Called once from app init or from the form component.
 */
export function seedSuggestions(fieldKey, defaults = []) {
  const storageKey = STORAGE_KEY_PREFIX + fieldKey;
  try {
    const existing = localStorage.getItem(storageKey);
    if (!existing) {
      localStorage.setItem(storageKey, JSON.stringify(defaults));
    }
  } catch {
    // Silent fail
  }
}
