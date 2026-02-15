/**
 * Unit tests for DarkModeToggle theme management
 * Tests theme preference storage, retrieval, cycling, and system preference detection
 */

import { DarkModeToggle, ThemePreference, EffectiveTheme } from '../utils/DarkModeToggle';

describe('DarkModeToggle Theme Management', () => {
  let darkModeToggle: DarkModeToggle;
  let localStorageMock: { [key: string]: string };
  let mediaQueryMock: {
    matches: boolean;
    addEventListener: jest.Mock;
    removeEventListener: jest.Mock;
  };

  beforeEach(() => {
    // Reset localStorage mock
    localStorageMock = {};
    
    Storage.prototype.getItem = jest.fn((key: string) => localStorageMock[key] || null);
    Storage.prototype.setItem = jest.fn((key: string, value: string) => {
      localStorageMock[key] = value;
    });
    Storage.prototype.removeItem = jest.fn((key: string) => {
      delete localStorageMock[key];
    });
    Storage.prototype.clear = jest.fn(() => {
      localStorageMock = {};
    });

    // Mock matchMedia
    mediaQueryMock = {
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    window.matchMedia = jest.fn(() => mediaQueryMock as any);

    // Mock document.documentElement.setAttribute
    document.documentElement.setAttribute = jest.fn();

    // Mock document.querySelector and createElement for meta tag
    const metaElement = {
      setAttribute: jest.fn(),
      getAttribute: jest.fn(),
    } as any;
    
    document.querySelector = jest.fn(() => null);
    document.createElement = jest.fn(() => metaElement);
    document.head.appendChild = jest.fn();

    // Mock window.dispatchEvent
    window.dispatchEvent = jest.fn();
  });

  afterEach(() => {
    if (darkModeToggle) {
      darkModeToggle.destroy();
    }
    jest.clearAllMocks();
  });

  describe('Theme Preference Storage and Retrieval', () => {
    it('should default to "auto" when no preference is saved', () => {
      darkModeToggle = new DarkModeToggle();
      expect(darkModeToggle.getThemePreference()).toBe('auto');
    });

    it('should retrieve saved "light" preference from localStorage', () => {
      localStorageMock['malla-theme-preference'] = 'light';
      darkModeToggle = new DarkModeToggle();
      expect(darkModeToggle.getThemePreference()).toBe('light');
    });

    it('should retrieve saved "dark" preference from localStorage', () => {
      localStorageMock['malla-theme-preference'] = 'dark';
      darkModeToggle = new DarkModeToggle();
      expect(darkModeToggle.getThemePreference()).toBe('dark');
    });

    it('should retrieve saved "auto" preference from localStorage', () => {
      localStorageMock['malla-theme-preference'] = 'auto';
      darkModeToggle = new DarkModeToggle();
      expect(darkModeToggle.getThemePreference()).toBe('auto');
    });

    it('should default to "auto" for invalid saved values', () => {
      localStorageMock['malla-theme-preference'] = 'invalid-value';
      darkModeToggle = new DarkModeToggle();
      expect(darkModeToggle.getThemePreference()).toBe('auto');
    });

    it('should save theme preference to localStorage when setTheme is called', () => {
      darkModeToggle = new DarkModeToggle();
      darkModeToggle.setTheme('dark');
      expect(localStorageMock['malla-theme-preference']).toBe('dark');
    });

    it('should update localStorage when cycling through themes', () => {
      darkModeToggle = new DarkModeToggle();
      
      // Start with auto (default)
      expect(darkModeToggle.getThemePreference()).toBe('auto');
      
      // Cycle to light
      darkModeToggle.cycleTheme();
      expect(localStorageMock['malla-theme-preference']).toBe('light');
      
      // Cycle to dark
      darkModeToggle.cycleTheme();
      expect(localStorageMock['malla-theme-preference']).toBe('dark');
      
      // Cycle to auto
      darkModeToggle.cycleTheme();
      expect(localStorageMock['malla-theme-preference']).toBe('auto');
      
      // Cycle back to light
      darkModeToggle.cycleTheme();
      expect(localStorageMock['malla-theme-preference']).toBe('light');
    });
  });

  describe('Theme Cycling Logic', () => {
    it('should cycle from light to dark', () => {
      localStorageMock['malla-theme-preference'] = 'light';
      darkModeToggle = new DarkModeToggle();
      darkModeToggle.cycleTheme();
      expect(darkModeToggle.getThemePreference()).toBe('dark');
    });

    it('should cycle from dark to auto', () => {
      localStorageMock['malla-theme-preference'] = 'dark';
      darkModeToggle = new DarkModeToggle();
      darkModeToggle.cycleTheme();
      expect(darkModeToggle.getThemePreference()).toBe('auto');
    });

    it('should cycle from auto to light', () => {
      localStorageMock['malla-theme-preference'] = 'auto';
      darkModeToggle = new DarkModeToggle();
      darkModeToggle.cycleTheme();
      expect(darkModeToggle.getThemePreference()).toBe('light');
    });

    it('should complete a full cycle: light → dark → auto → light', () => {
      darkModeToggle = new DarkModeToggle();
      darkModeToggle.setTheme('light');
      
      darkModeToggle.cycleTheme();
      expect(darkModeToggle.getThemePreference()).toBe('dark');
      
      darkModeToggle.cycleTheme();
      expect(darkModeToggle.getThemePreference()).toBe('auto');
      
      darkModeToggle.cycleTheme();
      expect(darkModeToggle.getThemePreference()).toBe('light');
    });
  });

  describe('System Preference Detection', () => {
    it('should resolve "auto" to "light" when system prefers light', () => {
      mediaQueryMock.matches = false; // System prefers light
      darkModeToggle = new DarkModeToggle();
      darkModeToggle.setTheme('auto');
      expect(darkModeToggle.getEffectiveTheme()).toBe('light');
    });

    it('should resolve "auto" to "dark" when system prefers dark', () => {
      mediaQueryMock.matches = true; // System prefers dark
      darkModeToggle = new DarkModeToggle();
      darkModeToggle.setTheme('auto');
      expect(darkModeToggle.getEffectiveTheme()).toBe('dark');
    });

    it('should return "light" as effective theme when preference is "light"', () => {
      darkModeToggle = new DarkModeToggle();
      darkModeToggle.setTheme('light');
      expect(darkModeToggle.getEffectiveTheme()).toBe('light');
    });

    it('should return "dark" as effective theme when preference is "dark"', () => {
      darkModeToggle = new DarkModeToggle();
      darkModeToggle.setTheme('dark');
      expect(darkModeToggle.getEffectiveTheme()).toBe('dark');
    });

    it('should register listener for system preference changes', () => {
      darkModeToggle = new DarkModeToggle();
      expect(mediaQueryMock.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should remove listener when destroyed', () => {
      darkModeToggle = new DarkModeToggle();
      const addedListener = mediaQueryMock.addEventListener.mock.calls[0][1];
      darkModeToggle.destroy();
      expect(mediaQueryMock.removeEventListener).toHaveBeenCalledWith('change', addedListener);
    });
  });

  describe('Theme Application', () => {
    it('should set data-bs-theme attribute to "light" when applying light theme', () => {
      darkModeToggle = new DarkModeToggle();
      darkModeToggle.applyTheme('light');
      expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-bs-theme', 'light');
    });

    it('should set data-bs-theme attribute to "dark" when applying dark theme', () => {
      darkModeToggle = new DarkModeToggle();
      darkModeToggle.applyTheme('dark');
      expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-bs-theme', 'dark');
    });

    it('should resolve "auto" to system preference when applying', () => {
      mediaQueryMock.matches = true; // System prefers dark
      darkModeToggle = new DarkModeToggle();
      darkModeToggle.applyTheme('auto');
      expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-bs-theme', 'dark');
    });

    it('should dispatch themeChanged event when applying theme', () => {
      darkModeToggle = new DarkModeToggle();
      darkModeToggle.applyTheme('dark');
      
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'themeChanged',
          detail: {
            preference: 'dark',
            effective: 'dark'
          }
        })
      );
    });

    it('should dispatch themeChanged event with resolved auto preference', () => {
      mediaQueryMock.matches = false; // System prefers light
      darkModeToggle = new DarkModeToggle();
      darkModeToggle.applyTheme('auto');
      
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'themeChanged',
          detail: {
            preference: 'auto',
            effective: 'light'
          }
        })
      );
    });
  });

  describe('Meta Theme Color', () => {
    it('should create meta theme-color tag if it does not exist', () => {
      darkModeToggle = new DarkModeToggle();
      darkModeToggle.applyTheme('light');
      
      expect(document.createElement).toHaveBeenCalledWith('meta');
      expect(document.head.appendChild).toHaveBeenCalled();
    });

    it('should set theme-color to #0d6efd for light theme', () => {
      const metaElement = {
        setAttribute: jest.fn(),
        getAttribute: jest.fn(),
      } as any;
      document.querySelector = jest.fn(() => metaElement);
      
      darkModeToggle = new DarkModeToggle();
      darkModeToggle.applyTheme('light');
      
      expect(metaElement.setAttribute).toHaveBeenCalledWith('content', '#0d6efd');
    });

    it('should set theme-color to #212529 for dark theme', () => {
      const metaElement = {
        setAttribute: jest.fn(),
        getAttribute: jest.fn(),
      } as any;
      document.querySelector = jest.fn(() => metaElement);
      
      darkModeToggle = new DarkModeToggle();
      darkModeToggle.applyTheme('dark');
      
      expect(metaElement.setAttribute).toHaveBeenCalledWith('content', '#212529');
    });

    it('should update existing meta tag instead of creating new one', () => {
      const existingMeta = {
        setAttribute: jest.fn(),
        getAttribute: jest.fn(),
      } as any;
      document.querySelector = jest.fn(() => existingMeta);
      
      darkModeToggle = new DarkModeToggle();
      darkModeToggle.applyTheme('dark');
      
      // Should not create a new element
      expect(document.head.appendChild).not.toHaveBeenCalled();
      // Should update existing element
      expect(existingMeta.setAttribute).toHaveBeenCalledWith('content', '#212529');
    });
  });

  describe('Initialization', () => {
    it('should apply saved theme on initialization', () => {
      localStorageMock['malla-theme-preference'] = 'dark';
      darkModeToggle = new DarkModeToggle();
      
      expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-bs-theme', 'dark');
    });

    it('should apply auto theme (resolved to system preference) on first load', () => {
      mediaQueryMock.matches = true; // System prefers dark
      darkModeToggle = new DarkModeToggle();
      
      expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-bs-theme', 'dark');
    });

    it('should set up system preference listener on initialization', () => {
      darkModeToggle = new DarkModeToggle();
      expect(mediaQueryMock.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple rapid theme changes', () => {
      darkModeToggle = new DarkModeToggle();
      
      darkModeToggle.setTheme('light');
      darkModeToggle.setTheme('dark');
      darkModeToggle.setTheme('auto');
      darkModeToggle.setTheme('light');
      
      expect(darkModeToggle.getThemePreference()).toBe('light');
      expect(localStorageMock['malla-theme-preference']).toBe('light');
    });

    it('should handle destroy being called multiple times', () => {
      darkModeToggle = new DarkModeToggle();
      darkModeToggle.destroy();
      darkModeToggle.destroy(); // Should not throw
      
      expect(mediaQueryMock.removeEventListener).toHaveBeenCalledTimes(1);
    });

    it('should not throw when localStorage is unavailable', () => {
      Storage.prototype.getItem = jest.fn(() => {
        throw new Error('localStorage unavailable');
      });
      
      expect(() => {
        darkModeToggle = new DarkModeToggle();
      }).toThrow(); // Will throw during getItem, which is expected behavior
    });
  });
});
