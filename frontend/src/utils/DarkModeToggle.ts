/**
 * DarkModeToggle - Theme management class with localStorage persistence
 * 
 * Implements a three-state theme toggle: light → dark → auto
 * Supports system preference detection and dispatches theme change events
 */

export type ThemePreference = 'light' | 'dark' | 'auto';
export type EffectiveTheme = 'light' | 'dark';

export interface ThemeChangedEvent extends CustomEvent {
  detail: {
    preference: ThemePreference;
    effective: EffectiveTheme;
  };
}

export class DarkModeToggle {
  private readonly storageKey = 'malla-theme-preference';
  private mediaQuery: MediaQueryList;
  private systemPreferenceListener: ((e: MediaQueryListEvent) => void) | null = null;

  constructor() {
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.init();
  }

  /**
   * Initialize the theme system
   * Applies saved or default theme and sets up system preference listener
   */
  private init(): void {
    // Apply saved or default theme
    const preference = this.getThemePreference();
    this.applyTheme(preference);

    // Listen for system preference changes
    this.systemPreferenceListener = () => {
      if (this.getThemePreference() === 'auto') {
        this.applyTheme('auto');
      }
    };
    
    this.mediaQuery.addEventListener('change', this.systemPreferenceListener);
  }

  /**
   * Get the saved theme preference from localStorage
   * @returns The saved theme preference or 'auto' as default
   */
  getThemePreference(): ThemePreference {
    const saved = localStorage.getItem(this.storageKey);
    if (saved === 'light' || saved === 'dark' || saved === 'auto') {
      return saved;
    }
    return 'auto';
  }

  /**
   * Get the effective theme (resolved from preference)
   * @returns 'light' or 'dark' based on preference and system settings
   */
  getEffectiveTheme(): EffectiveTheme {
    const preference = this.getThemePreference();
    if (preference === 'auto') {
      return this.mediaQuery.matches ? 'dark' : 'light';
    }
    return preference;
  }

  /**
   * Apply a theme to the document
   * @param theme - The theme preference to apply
   */
  applyTheme(theme: ThemePreference): void {
    const effectiveTheme = theme === 'auto'
      ? (this.mediaQuery.matches ? 'dark' : 'light')
      : theme;

    // Set Bootstrap 5.3 theme attribute
    document.documentElement.setAttribute('data-bs-theme', effectiveTheme);

    // Update meta theme-color for mobile browsers
    this.updateMetaThemeColor(effectiveTheme);

    // Dispatch custom event for components to listen to
    const event = new CustomEvent('themeChanged', {
      detail: {
        preference: theme,
        effective: effectiveTheme
      }
    }) as ThemeChangedEvent;
    
    window.dispatchEvent(event);
  }

  /**
   * Cycle through theme preferences: light → dark → auto → light
   */
  cycleTheme(): void {
    const current = this.getThemePreference();
    const next: ThemePreference = {
      'light': 'dark',
      'dark': 'auto',
      'auto': 'light'
    }[current] as ThemePreference;

    this.setTheme(next);
  }

  /**
   * Set a specific theme preference
   * @param theme - The theme preference to set
   */
  setTheme(theme: ThemePreference): void {
    localStorage.setItem(this.storageKey, theme);
    this.applyTheme(theme);
  }

  /**
   * Update the meta theme-color tag for mobile browsers
   * @param theme - The effective theme ('light' or 'dark')
   */
  private updateMetaThemeColor(theme: EffectiveTheme): void {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    
    // Bootstrap primary colors for light/dark themes
    const color = theme === 'dark' ? '#212529' : '#0d6efd';
    metaThemeColor.setAttribute('content', color);
  }

  /**
   * Clean up event listeners
   * Call this when the component is unmounted
   */
  destroy(): void {
    if (this.systemPreferenceListener) {
      this.mediaQuery.removeEventListener('change', this.systemPreferenceListener);
      this.systemPreferenceListener = null;
    }
  }
}

// Export a singleton instance factory for convenience
let singletonInstance: DarkModeToggle | null = null;

export const getDarkModeToggle = (): DarkModeToggle => {
  if (!singletonInstance) {
    singletonInstance = new DarkModeToggle();
  }
  return singletonInstance;
};
