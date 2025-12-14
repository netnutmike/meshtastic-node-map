import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CustomLinksMenu from '../components/CustomLinksMenu/CustomLinksMenu';
import { loadCustomLinks } from '../services/config';
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
  loadCustomLinks: jest.fn(),
}));

const mockLoadCustomLinks = loadCustomLinks as jest.MockedFunction<typeof loadCustomLinks>;

// Mock window.open
const mockWindowOpen = jest.fn();
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true,
});

describe('CustomLinksMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWindowOpen.mockClear();
  });

  describe('Custom links configuration loading', () => {
    it('should load custom links from configuration service', async () => {
      const mockLinks = [
        {
          name: 'Test Link 1',
          description: 'Test description 1',
          url: 'https://example1.com',
          icon: 'book',
        },
        {
          name: 'Test Link 2',
          description: 'Test description 2',
          url: 'https://example2.com',
          icon: 'forum',
        },
      ];

      mockLoadCustomLinks.mockResolvedValue(mockLinks);

      render(<CustomLinksMenu />);

      // Wait for the component to load and render the button
      await waitFor(() => {
        const customLinksButton = screen.getByRole('button', { name: /custom links/i });
        expect(customLinksButton).toBeInTheDocument();
      });

      expect(mockLoadCustomLinks).toHaveBeenCalledTimes(1);
    });

    it('should handle configuration loading errors gracefully', async () => {
      mockLoadCustomLinks.mockRejectedValue(new Error('Config load failed'));

      render(<CustomLinksMenu />);

      await waitFor(() => {
        expect(mockLoadCustomLinks).toHaveBeenCalledTimes(1);
      });

      // Should not render anything when loading fails
      const customLinksButton = screen.queryByRole('button', { name: /custom links/i });
      expect(customLinksButton).not.toBeInTheDocument();
    });
  });

  describe('Conditional visibility logic', () => {
    it('should hide custom links icon when no links are configured (Requirement 12.4)', async () => {
      mockLoadCustomLinks.mockResolvedValue([]);

      render(<CustomLinksMenu />);

      await waitFor(() => {
        expect(mockLoadCustomLinks).toHaveBeenCalledTimes(1);
      });

      // Should not render the button when no links are configured
      const customLinksButton = screen.queryByRole('button', { name: /custom links/i });
      expect(customLinksButton).not.toBeInTheDocument();
    });

    it('should show custom links icon when links are configured (Requirement 12.3)', async () => {
      const mockLinks = [
        {
          name: 'Documentation',
          description: 'Official docs',
          url: 'https://docs.example.com',
          icon: 'book',
        },
      ];

      mockLoadCustomLinks.mockResolvedValue(mockLinks);

      render(<CustomLinksMenu />);

      // Wait for the component to load and render the button
      await waitFor(() => {
        const customLinksButton = screen.getByRole('button', { name: /custom links/i });
        expect(customLinksButton).toBeInTheDocument();
      });

      expect(mockLoadCustomLinks).toHaveBeenCalledTimes(1);
    });
  });

  describe('Link display and interaction behavior', () => {
    const mockLinks = [
      {
        name: 'Meshtastic Documentation',
        description: 'Official Meshtastic documentation',
        url: 'https://meshtastic.org/docs',
        icon: 'book',
      },
      {
        name: 'Community Forum',
        description: 'Meshtastic community discussions',
        url: 'https://meshtastic.discourse.group',
        icon: 'forum',
      },
    ];

    beforeEach(() => {
      mockLoadCustomLinks.mockResolvedValue(mockLinks);
    });

    it('should display menu with hover descriptions when button is clicked', async () => {
      render(<CustomLinksMenu />);

      // Wait for the component to load and render the button
      const customLinksButton = await waitFor(() => 
        screen.getByRole('button', { name: /custom links/i })
      );
      
      fireEvent.click(customLinksButton);

      // Should show menu items with names and descriptions
      expect(screen.getByText('Meshtastic Documentation')).toBeInTheDocument();
      expect(screen.getByText('Official Meshtastic documentation')).toBeInTheDocument();
      expect(screen.getByText('Community Forum')).toBeInTheDocument();
      expect(screen.getByText('Meshtastic community discussions')).toBeInTheDocument();
    });

    it('should open external links in new tab when menu item is clicked', async () => {
      render(<CustomLinksMenu />);

      // Wait for the component to load and render the button
      const customLinksButton = await waitFor(() => 
        screen.getByRole('button', { name: /custom links/i })
      );
      
      fireEvent.click(customLinksButton);

      const documentationLink = screen.getByText('Meshtastic Documentation');
      fireEvent.click(documentationLink);

      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://meshtastic.org/docs',
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('should close menu after clicking a link', async () => {
      render(<CustomLinksMenu />);

      // Wait for the component to load and render the button
      const customLinksButton = await waitFor(() => 
        screen.getByRole('button', { name: /custom links/i })
      );
      
      fireEvent.click(customLinksButton);

      const documentationLink = screen.getByText('Meshtastic Documentation');
      fireEvent.click(documentationLink);

      // Menu should close after clicking a link
      await waitFor(() => {
        expect(screen.queryByText('Meshtastic Documentation')).not.toBeInTheDocument();
      });
    });

    it('should display appropriate icons for different link types', async () => {
      render(<CustomLinksMenu />);

      // Wait for the component to load and render the button
      const customLinksButton = await waitFor(() => 
        screen.getByRole('button', { name: /custom links/i })
      );
      
      fireEvent.click(customLinksButton);

      // Check that menu items are rendered (icons are rendered as SVG elements)
      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems).toHaveLength(2);
      
      // Verify the menu items contain the expected text
      expect(screen.getByText('Meshtastic Documentation')).toBeInTheDocument();
      expect(screen.getByText('Community Forum')).toBeInTheDocument();
    });

    it('should handle links without icons gracefully', async () => {
      const linksWithoutIcons = [
        {
          name: 'No Icon Link',
          description: 'Link without icon',
          url: 'https://example.com',
        },
      ];

      mockLoadCustomLinks.mockResolvedValue(linksWithoutIcons);

      render(<CustomLinksMenu />);

      // Wait for the component to load and render the button
      const customLinksButton = await waitFor(() => 
        screen.getByRole('button', { name: /custom links/i })
      );
      
      fireEvent.click(customLinksButton);

      expect(screen.getByText('No Icon Link')).toBeInTheDocument();
      expect(screen.getByText('Link without icon')).toBeInTheDocument();
    });
  });

  describe('Menu interaction', () => {
    const mockLinks = [
      {
        name: 'Test Link',
        description: 'Test description',
        url: 'https://example.com',
        icon: 'book',
      },
    ];

    beforeEach(() => {
      mockLoadCustomLinks.mockResolvedValue(mockLinks);
    });

    it('should close menu when clicking outside', async () => {
      render(<CustomLinksMenu />);

      // Wait for the component to load and render the button
      const customLinksButton = await waitFor(() => 
        screen.getByRole('button', { name: /custom links/i })
      );
      
      fireEvent.click(customLinksButton);

      expect(screen.getByText('Test Link')).toBeInTheDocument();

      // Click on the backdrop to close the menu
      const backdrop = document.querySelector('.MuiBackdrop-root');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      await waitFor(() => {
        expect(screen.queryByText('Test Link')).not.toBeInTheDocument();
      });
    });

    it('should have proper accessibility attributes', async () => {
      render(<CustomLinksMenu />);

      // Wait for the component to load and render the button
      const customLinksButton = await waitFor(() => 
        screen.getByRole('button', { name: /custom links/i })
      );
      
      expect(customLinksButton).toHaveAttribute('aria-label', 'custom links');
      expect(customLinksButton).toHaveAttribute('aria-haspopup', 'true');
      expect(customLinksButton).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(customLinksButton);

      expect(customLinksButton).toHaveAttribute('aria-expanded', 'true');
      expect(customLinksButton).toHaveAttribute('aria-controls', 'custom-links-menu');
    });
  });
});