import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AboutContent from '../components/AboutContent/AboutContent';
import { loadAboutPageConfig, getSystemInfo } from '../services/config';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';

// Mock the config service
jest.mock('../services/config', () => ({
  loadAboutPageConfig: jest.fn(),
  getSystemInfo: jest.fn(),
}));

// Mock the WebSocket service
jest.mock('../services/websocket', () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
}));

const mockLoadAboutPageConfig = loadAboutPageConfig as jest.MockedFunction<typeof loadAboutPageConfig>;
const mockGetSystemInfo = getSystemInfo as jest.MockedFunction<typeof getSystemInfo>;

const theme = createTheme();

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('AboutContent', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Default mock implementations
    mockGetSystemInfo.mockReturnValue({
      version: '1.0.0',
      buildDate: '2024-01-01T00:00:00.000Z',
      userAgent: 'Mozilla/5.0 (Test Browser)',
      screenResolution: '1920 × 1080',
      viewport: '1024 × 768',
      language: 'en-US',
      platform: 'Test Platform',
      cookieEnabled: true,
      onlineStatus: true,
    });

    mockLoadAboutPageConfig.mockResolvedValue({
      appInfo: {
        name: 'Test Meshtastic Node Mapper',
        version: '1.0.0',
        description: 'Test description for Meshtastic Node Mapper',
        author: 'Test Author',
        license: 'GPL-3.0',
        repository: 'https://github.com/test/repo',
        homepage: 'https://test.example.com',
      },
      customContent: [
        {
          title: 'Test Custom Section',
          content: 'This is test custom content',
          type: 'text' as const,
        },
      ],
      showTechnicalDetails: true,
      showContributors: true,
    });
  });

  describe('Version Display and Content Rendering', () => {
    it('should display application version from configuration', async () => {
      renderWithProviders(<AboutContent />);

      await waitFor(() => {
        expect(screen.getByText('Version 1.0.0')).toBeInTheDocument();
      });
    });

    it('should display application name and description', async () => {
      renderWithProviders(<AboutContent />);

      await waitFor(() => {
        expect(screen.getByText('Test Meshtastic Node Mapper')).toBeInTheDocument();
        expect(screen.getByText('Test description for Meshtastic Node Mapper')).toBeInTheDocument();
      });
    });

    it('should display author and license information', async () => {
      renderWithProviders(<AboutContent />);

      await waitFor(() => {
        expect(screen.getByText('Created by Test Author')).toBeInTheDocument();
        expect(screen.getByText('GPL-3.0')).toBeInTheDocument();
      });
    });

    it('should render custom content sections', async () => {
      renderWithProviders(<AboutContent />);

      await waitFor(() => {
        expect(screen.getByText('Test Custom Section')).toBeInTheDocument();
        expect(screen.getByText('This is test custom content')).toBeInTheDocument();
      });
    });
  });

  describe('Configurable Content Sections', () => {
    it('should render multiple custom content sections when provided', async () => {
      mockLoadAboutPageConfig.mockResolvedValue({
        appInfo: {
          name: 'Test App',
          version: '1.0.0',
          description: 'Test description',
        },
        customContent: [
          {
            title: 'Section 1',
            content: 'Content 1',
            type: 'text' as const,
          },
          {
            title: 'Section 2',
            content: 'Content 2',
            type: 'text' as const,
          },
        ],
      });

      renderWithProviders(<AboutContent />);

      await waitFor(() => {
        expect(screen.getByText('Section 1')).toBeInTheDocument();
        expect(screen.getByText('Content 1')).toBeInTheDocument();
        expect(screen.getByText('Section 2')).toBeInTheDocument();
        expect(screen.getByText('Content 2')).toBeInTheDocument();
      });
    });

    it('should handle HTML content type', async () => {
      mockLoadAboutPageConfig.mockResolvedValue({
        appInfo: {
          name: 'Test App',
          version: '1.0.0',
          description: 'Test description',
        },
        customContent: [
          {
            title: 'HTML Section',
            content: '<strong>Bold text</strong> and <em>italic text</em>',
            type: 'html' as const,
          },
        ],
      });

      renderWithProviders(<AboutContent />);

      await waitFor(() => {
        expect(screen.getByText('HTML Section')).toBeInTheDocument();
        // The HTML content should be rendered
        const boldElement = screen.getByText('Bold text');
        expect(boldElement.tagName).toBe('STRONG');
      });
    });

    it('should handle markdown content type', async () => {
      mockLoadAboutPageConfig.mockResolvedValue({
        appInfo: {
          name: 'Test App',
          version: '1.0.0',
          description: 'Test description',
        },
        customContent: [
          {
            title: 'Markdown Section',
            content: 'Line 1\nLine 2\nLine 3',
            type: 'markdown' as const,
          },
        ],
      });

      renderWithProviders(<AboutContent />);

      await waitFor(() => {
        expect(screen.getByText('Markdown Section')).toBeInTheDocument();
        expect(screen.getByText(/Line 1.*Line 2.*Line 3/s)).toBeInTheDocument();
      });
    });

    it('should not render custom content sections when not provided', async () => {
      mockLoadAboutPageConfig.mockResolvedValue({
        appInfo: {
          name: 'Test App',
          version: '1.0.0',
          description: 'Test description',
        },
        // No customContent provided
      });

      renderWithProviders(<AboutContent />);

      await waitFor(() => {
        expect(screen.getByText('Test App')).toBeInTheDocument();
        // Should not have any custom content sections
        expect(screen.queryByText('Test Custom Section')).not.toBeInTheDocument();
      });
    });
  });

  describe('Technical Details Section', () => {
    it('should show technical details when enabled', async () => {
      mockLoadAboutPageConfig.mockResolvedValue({
        appInfo: {
          name: 'Test App',
          version: '1.0.0',
          description: 'Test description',
        },
        showTechnicalDetails: true,
      });

      renderWithProviders(<AboutContent />);

      await waitFor(() => {
        expect(screen.getByText('Technical Details')).toBeInTheDocument();
        expect(screen.getByText('React 18 with TypeScript')).toBeInTheDocument();
        expect(screen.getByText('Leaflet.js with OpenStreetMap')).toBeInTheDocument();
        expect(screen.getByText('WebSocket with Socket.io')).toBeInTheDocument();
        expect(screen.getByText('MQTT with Meshtastic Protobuf')).toBeInTheDocument();
      });
    });

    it('should hide technical details when disabled', async () => {
      mockLoadAboutPageConfig.mockResolvedValue({
        appInfo: {
          name: 'Test App',
          version: '1.0.0',
          description: 'Test description',
        },
        showTechnicalDetails: false,
      });

      renderWithProviders(<AboutContent />);

      await waitFor(() => {
        expect(screen.getByText('Test App')).toBeInTheDocument();
        expect(screen.queryByText('Technical Details')).not.toBeInTheDocument();
      });
    });
  });

  describe('System Information', () => {
    it('should display system information from getSystemInfo', async () => {
      renderWithProviders(<AboutContent />);

      await waitFor(() => {
        expect(screen.getByText('System Information')).toBeInTheDocument();
        expect(screen.getByText('1.0.0')).toBeInTheDocument(); // version
        expect(screen.getByText('Test Platform')).toBeInTheDocument(); // platform
        expect(screen.getByText('1920 × 1080')).toBeInTheDocument(); // screen resolution
        expect(screen.getByText('1024 × 768')).toBeInTheDocument(); // viewport
        expect(screen.getByText('en-US')).toBeInTheDocument(); // language
        expect(screen.getByText('Online')).toBeInTheDocument(); // online status
        expect(screen.getByText('Yes')).toBeInTheDocument(); // cookies enabled
      });
    });

    it('should handle offline status', async () => {
      mockGetSystemInfo.mockReturnValue({
        version: '1.0.0',
        buildDate: '2024-01-01T00:00:00.000Z',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        screenResolution: '1920 × 1080',
        viewport: '1024 × 768',
        language: 'en-US',
        platform: 'Test Platform',
        cookieEnabled: false,
        onlineStatus: false,
      });

      renderWithProviders(<AboutContent />);

      await waitFor(() => {
        expect(screen.getByText('Offline')).toBeInTheDocument();
        expect(screen.getByText('No')).toBeInTheDocument(); // cookies disabled
      });
    });
  });

  describe('Navigation and Links', () => {
    it('should render external links when provided', async () => {
      renderWithProviders(<AboutContent />);

      await waitFor(() => {
        const repositoryLink = screen.getByText('Source Code');
        expect(repositoryLink.closest('a')).toHaveAttribute('href', 'https://github.com/test/repo');
        expect(repositoryLink.closest('a')).toHaveAttribute('target', '_blank');

        const homepageLink = screen.getByText('Official Website');
        expect(homepageLink.closest('a')).toHaveAttribute('href', 'https://test.example.com');
        expect(homepageLink.closest('a')).toHaveAttribute('target', '_blank');
      });
    });

    it('should render default Meshtastic links', async () => {
      renderWithProviders(<AboutContent />);

      await waitFor(() => {
        const docsLink = screen.getByText('Meshtastic Documentation');
        expect(docsLink.closest('a')).toHaveAttribute('href', 'https://meshtastic.org/docs');

        const forumLink = screen.getByText('Community Forum');
        expect(forumLink.closest('a')).toHaveAttribute('href', 'https://meshtastic.discourse.group');
      });
    });
  });

  describe('Responsive Layout', () => {
    it('should render without crashing on different screen sizes', async () => {
      // Test mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      renderWithProviders(<AboutContent />);

      await waitFor(() => {
        expect(screen.getByText('Test Meshtastic Node Mapper')).toBeInTheDocument();
      });

      // Test desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1080,
      });

      renderWithProviders(<AboutContent />);

      await waitFor(() => {
        expect(screen.getByText('Test Meshtastic Node Mapper')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle configuration loading errors gracefully', async () => {
      mockLoadAboutPageConfig.mockRejectedValue(new Error('Config load failed'));

      renderWithProviders(<AboutContent />);

      // Should show error message when config loading fails
      await waitFor(() => {
        expect(screen.getByText('Failed to load about information')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      // Mock a delayed response
      mockLoadAboutPageConfig.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      renderWithProviders(<AboutContent />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should show error state when config is null', async () => {
      mockLoadAboutPageConfig.mockResolvedValue(null as any);

      renderWithProviders(<AboutContent />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load about information')).toBeInTheDocument();
      });
    });
  });
});