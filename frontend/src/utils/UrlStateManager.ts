/**
 * UrlStateManager - Utility for syncing filter state to URL parameters
 * Requirements: 44.1, 44.2, 44.6, 44.7, 44.8, 44.9
 * 
 * Provides automatic synchronization between application state and URL parameters
 * with debouncing, validation, and support for complex data types.
 */

import React from 'react';

type StateValue = string | number | boolean | null | undefined | string[] | number[];
type StateObject = Record<string, StateValue>;

interface UrlStateManagerOptions {
  /**
   * Debounce delay in milliseconds for URL updates
   * Default: 300ms
   */
  debounceMs?: number;

  /**
   * Whether to use replaceState (true) or pushState (false)
   * Default: true (replaceState to avoid cluttering history)
   */
  useReplaceState?: boolean;

  /**
   * Custom validator function for URL parameters
   */
  validator?: (key: string, value: any) => boolean;

  /**
   * Custom sanitizer function for URL parameters
   */
  sanitizer?: (key: string, value: any) => any;
}

export class UrlStateManager {
  private debounceTimer: NodeJS.Timeout | null = null;
  private options: Required<UrlStateManagerOptions>;

  constructor(options: UrlStateManagerOptions = {}) {
    this.options = {
      debounceMs: options.debounceMs ?? 300,
      useReplaceState: options.useReplaceState ?? true,
      validator: options.validator ?? this.defaultValidator,
      sanitizer: options.sanitizer ?? this.defaultSanitizer,
    };
  }

  /**
   * Default validator - allows all non-empty values
   */
  private defaultValidator(key: string, value: any): boolean {
    if (value === null || value === undefined || value === '') {
      return false;
    }
    if (Array.isArray(value) && value.length === 0) {
      return false;
    }
    return true;
  }

  /**
   * Default sanitizer - basic XSS prevention
   */
  private defaultSanitizer(key: string, value: any): any {
    if (typeof value === 'string') {
      // Remove potentially dangerous characters
      return value.replace(/[<>'"]/g, '');
    }
    return value;
  }

  /**
   * Update URL parameters from state object
   * Debounced to avoid excessive history updates
   * Requirements: 44.1, 44.2, 44.6
   */
  updateUrl(state: StateObject): void {
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Debounce the update
    this.debounceTimer = setTimeout(() => {
      this.performUrlUpdate(state);
    }, this.options.debounceMs);
  }

  /**
   * Perform the actual URL update
   * Requirements: 44.1, 44.2, 44.4, 44.5, 44.7, 44.9
   */
  private performUrlUpdate(state: StateObject): void {
    const params = new URLSearchParams();

    // Process each state property
    Object.entries(state).forEach(([key, value]) => {
      // Validate the value
      if (!this.options.validator(key, value)) {
        // Skip null/empty values (Requirement 44.4)
        return;
      }

      // Sanitize the value
      const sanitizedValue = this.options.sanitizer(key, value);

      // Handle arrays (Requirement 44.7)
      if (Array.isArray(sanitizedValue)) {
        sanitizedValue.forEach((item) => {
          if (item !== null && item !== undefined && item !== '') {
            params.append(key, String(item));
          }
        });
      } else {
        // Handle single values
        params.set(key, String(sanitizedValue));
      }
    });

    // Build the new URL
    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    // Update the URL without page reload (Requirement 44.1, 44.2)
    if (this.options.useReplaceState) {
      window.history.replaceState({}, '', newUrl);
    } else {
      window.history.pushState({}, '', newUrl);
    }
  }

  /**
   * Parse state from current URL parameters
   * Requirements: 44.3, 44.8, 44.9
   */
  getStateFromUrl(): StateObject {
    const params = new URLSearchParams(window.location.search);
    const state: StateObject = {};

    // Track which keys have multiple values (arrays)
    const arrayKeys = new Set<string>();
    const allParams = params.toString();
    
    // Detect array parameters by checking for duplicate keys
    params.forEach((value, key) => {
      const regex = new RegExp(`${encodeURIComponent(key)}=`, 'g');
      const matches = allParams.match(regex);
      if (matches && matches.length > 1) {
        arrayKeys.add(key);
      }
    });

    // Process parameters
    params.forEach((value, key) => {
      // Validate and sanitize (Requirement 44.8)
      if (!this.options.validator(key, value)) {
        return;
      }

      const sanitizedValue = this.options.sanitizer(key, value);

      if (arrayKeys.has(key)) {
        // Handle array parameters (Requirement 44.7)
        if (!state[key]) {
          state[key] = [];
        }
        (state[key] as string[]).push(sanitizedValue);
      } else {
        // Handle single value
        state[key] = this.parseValue(sanitizedValue);
      }
    });

    return state;
  }

  /**
   * Parse a string value to its appropriate type
   */
  private parseValue(value: string): string | number | boolean {
    // Try to parse as number
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      const num = Number(value);
      if (!isNaN(num)) {
        return num;
      }
    }

    // Try to parse as boolean
    if (value === 'true') return true;
    if (value === 'false') return false;

    // Return as string
    return value;
  }

  /**
   * Sync state object with URL parameters
   * Useful for initial page load (Requirement 44.3)
   */
  syncFromUrl<T extends StateObject>(defaultState: T): T {
    const urlState = this.getStateFromUrl();
    return { ...defaultState, ...urlState } as T;
  }

  /**
   * Clear all URL parameters
   */
  clearUrl(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    const newUrl = window.location.pathname;
    
    if (this.options.useReplaceState) {
      window.history.replaceState({}, '', newUrl);
    } else {
      window.history.pushState({}, '', newUrl);
    }
  }

  /**
   * Get the current URL with all parameters
   * Useful for sharing/bookmarking (Requirement 44.10, 44.12, 44.13)
   */
  getCurrentUrl(): string {
    return window.location.href;
  }

  /**
   * Copy current URL to clipboard
   * Requirement: 44.12
   */
  async copyUrlToClipboard(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(this.getCurrentUrl());
      return true;
    } catch (error) {
      console.error('Failed to copy URL to clipboard:', error);
      return false;
    }
  }

  /**
   * Listen for browser back/forward navigation
   * Requirement: 44.11
   */
  onPopState(callback: (state: StateObject) => void): () => void {
    const handler = () => {
      const state = this.getStateFromUrl();
      callback(state);
    };

    window.addEventListener('popstate', handler);

    // Return cleanup function
    return () => {
      window.removeEventListener('popstate', handler);
    };
  }

  /**
   * Cleanup - clear any pending timers
   */
  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}

/**
 * Create a singleton instance for global use
 */
export const urlStateManager = new UrlStateManager();

/**
 * React hook for URL state management
 * Automatically syncs state with URL parameters
 */
export function useUrlState<T extends StateObject>(
  defaultState: T
): [T, (updates: Partial<T>) => void, UrlStateManager] {
  const [state, setState] = React.useState<T>(() => {
    // Initialize from URL on mount
    return urlStateManager.syncFromUrl(defaultState);
  });

  React.useEffect(() => {
    // Listen for browser navigation
    const cleanup = urlStateManager.onPopState((urlState) => {
      setState({ ...defaultState, ...urlState } as T);
    });

    return cleanup;
  }, [defaultState]);

  const updateState = React.useCallback(
    (updates: Partial<T>) => {
      const newState = { ...state, ...updates };
      setState(newState);
      urlStateManager.updateUrl(newState);
    },
    [state]
  );

  return [state, updateState, urlStateManager];
}
