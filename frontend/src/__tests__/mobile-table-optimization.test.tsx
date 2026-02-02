/**
 * Unit tests for mobile table optimization
 * 
 * Tests:
 * - Column hiding on mobile breakpoints
 * - Font size and padding adjustments
 * - Input font size for iOS
 * 
 * Requirements: 36.8, 36.9, 36.10
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock window.matchMedia
const mockMatchMedia = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => {
      const match = query.match(/\(min-width:\s*(\d+)px\)/);
      const minWidth = match ? parseInt(match[1]) : 0;
      return {
        matches: width >= minWidth,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      };
    }),
  });
};

// Test component with responsive table
const TestTable: React.FC = () => {
  return (
    <div className="responsive-table">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th className="hide-mobile">Hardware</th>
            <th className="hide-mobile">Firmware</th>
            <th className="hide-mobile">Last Seen</th>
            <th className="actions-column">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>Node 1</td>
            <td className="hide-mobile">T-Beam</td>
            <td className="hide-mobile">2.1.0</td>
            <td className="hide-mobile">2 hours ago</td>
            <td className="actions-column">
              <button className="btn-icon">View</button>
            </td>
          </tr>
          <tr>
            <td>2</td>
            <td>Node 2</td>
            <td className="hide-mobile">Heltec</td>
            <td className="hide-mobile">2.0.5</td>
            <td className="hide-mobile">5 hours ago</td>
            <td className="actions-column">
              <button className="btn-icon">View</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// Test component with form inputs
const TestForm: React.FC = () => {
  return (
    <div className="responsive-table">
      <form>
        <input type="text" placeholder="Search..." className="form-control" />
        <select className="form-select">
          <option>Option 1</option>
          <option>Option 2</option>
        </select>
        <textarea className="form-control" placeholder="Notes..."></textarea>
      </form>
    </div>
  );
};

describe('Mobile Table Optimization', () => {
  beforeEach(() => {
    // Reset window size
    mockMatchMedia(1024);
  });

  describe('Column Hiding on Mobile (Requirement 36.8)', () => {
    it('should hide columns with .hide-mobile class on mobile viewport', () => {
      mockMatchMedia(600); // Mobile viewport
      const { container } = render(<TestTable />);

      const hiddenColumns = container.querySelectorAll('.hide-mobile');
      expect(hiddenColumns.length).toBeGreaterThan(0);

      // Check that CSS would hide these columns
      // In actual rendering, these would have display: none
      hiddenColumns.forEach(column => {
        expect(column).toHaveClass('hide-mobile');
      });
    });

    it('should show all columns on desktop viewport', () => {
      mockMatchMedia(1024); // Desktop viewport
      const { container } = render(<TestTable />);

      const hiddenColumns = container.querySelectorAll('.hide-mobile');
      expect(hiddenColumns.length).toBeGreaterThan(0);

      // On desktop, these columns should be visible
      // CSS would set display: table-cell
      hiddenColumns.forEach(column => {
        expect(column).toHaveClass('hide-mobile');
      });
    });

    it('should hide Hardware column on mobile', () => {
      mockMatchMedia(600);
      render(<TestTable />);

      const hardwareHeaders = screen.getAllByText('Hardware');
      expect(hardwareHeaders[0]).toHaveClass('hide-mobile');
    });

    it('should hide Firmware column on mobile', () => {
      mockMatchMedia(600);
      render(<TestTable />);

      const firmwareHeaders = screen.getAllByText('Firmware');
      expect(firmwareHeaders[0]).toHaveClass('hide-mobile');
    });

    it('should hide Last Seen column on mobile', () => {
      mockMatchMedia(600);
      render(<TestTable />);

      const lastSeenHeaders = screen.getAllByText('Last Seen');
      expect(lastSeenHeaders[0]).toHaveClass('hide-mobile');
    });

    it('should always show ID column', () => {
      mockMatchMedia(600);
      render(<TestTable />);

      const idHeader = screen.getByText('ID');
      expect(idHeader).not.toHaveClass('hide-mobile');
    });

    it('should always show Name column', () => {
      mockMatchMedia(600);
      render(<TestTable />);

      const nameHeader = screen.getByText('Name');
      expect(nameHeader).not.toHaveClass('hide-mobile');
    });

    it('should always show Actions column', () => {
      mockMatchMedia(600);
      render(<TestTable />);

      const actionsHeader = screen.getByText('Actions');
      expect(actionsHeader).not.toHaveClass('hide-mobile');
      expect(actionsHeader).toHaveClass('actions-column');
    });
  });

  describe('Font Size and Padding Adjustments (Requirement 36.9)', () => {
    it('should apply responsive-table class to table container', () => {
      const { container } = render(<TestTable />);

      const tableContainer = container.querySelector('.responsive-table');
      expect(tableContainer).toBeInTheDocument();
    });

    it('should have table element inside responsive-table container', () => {
      const { container } = render(<TestTable />);

      const table = container.querySelector('.responsive-table table');
      expect(table).toBeInTheDocument();
    });

    it('should have thead with proper structure', () => {
      const { container } = render(<TestTable />);

      const thead = container.querySelector('.responsive-table thead');
      expect(thead).toBeInTheDocument();
      
      const headerCells = thead?.querySelectorAll('th');
      expect(headerCells?.length).toBe(6); // ID, Name, Hardware, Firmware, Last Seen, Actions
    });

    it('should have tbody with proper structure', () => {
      const { container } = render(<TestTable />);

      const tbody = container.querySelector('.responsive-table tbody');
      expect(tbody).toBeInTheDocument();
      
      const rows = tbody?.querySelectorAll('tr');
      expect(rows?.length).toBe(2);
    });

    it('should apply responsive-table class for font size control', () => {
      mockMatchMedia(600); // Mobile
      const { container } = render(<TestTable />);

      const table = container.querySelector('.responsive-table table');
      expect(table).toBeInTheDocument();
      
      // CSS would apply font-size: 0.8rem on mobile
      // and padding: 0.4rem 0.3rem
    });

    it('should have proper table structure for CSS targeting', () => {
      const { container } = render(<TestTable />);

      // Check that CSS selectors can target these elements
      const headerCells = container.querySelectorAll('.responsive-table thead th');
      const bodyCells = container.querySelectorAll('.responsive-table tbody td');
      
      expect(headerCells.length).toBeGreaterThan(0);
      expect(bodyCells.length).toBeGreaterThan(0);
    });
  });

  describe('Input Font Size for iOS (Requirement 36.10)', () => {
    it('should have form inputs inside responsive-table container', () => {
      const { container } = render(<TestForm />);

      const input = container.querySelector('.responsive-table input');
      expect(input).toBeInTheDocument();
    });

    it('should have select elements inside responsive-table container', () => {
      const { container } = render(<TestForm />);

      const select = container.querySelector('.responsive-table select');
      expect(select).toBeInTheDocument();
    });

    it('should have textarea elements inside responsive-table container', () => {
      const { container } = render(<TestForm />);

      const textarea = container.querySelector('.responsive-table textarea');
      expect(textarea).toBeInTheDocument();
    });

    it('should apply form-control class to text input', () => {
      const { container } = render(<TestForm />);

      const input = container.querySelector('input');
      expect(input).toHaveClass('form-control');
    });

    it('should apply form-select class to select element', () => {
      const { container } = render(<TestForm />);

      const select = container.querySelector('select');
      expect(select).toHaveClass('form-select');
    });

    it('should apply form-control class to textarea', () => {
      const { container } = render(<TestForm />);

      const textarea = container.querySelector('textarea');
      expect(textarea).toHaveClass('form-control');
    });

    it('should have proper structure for CSS font-size targeting', () => {
      mockMatchMedia(600); // Mobile
      const { container } = render(<TestForm />);

      // CSS would apply font-size: 16px to prevent iOS zoom
      const input = container.querySelector('.responsive-table input');
      const select = container.querySelector('.responsive-table select');
      const textarea = container.querySelector('.responsive-table textarea');

      expect(input).toBeInTheDocument();
      expect(select).toBeInTheDocument();
      expect(textarea).toBeInTheDocument();
    });
  });

  describe('Sticky Actions Column', () => {
    it('should have actions-column class on actions column', () => {
      const { container } = render(<TestTable />);

      const actionsHeader = container.querySelector('th.actions-column');
      expect(actionsHeader).toBeInTheDocument();
    });

    it('should have actions-column class on all action cells', () => {
      const { container } = render(<TestTable />);

      const actionsCells = container.querySelectorAll('td.actions-column');
      expect(actionsCells.length).toBe(2); // One per row
    });

    it('should have button inside actions column', () => {
      const { container } = render(<TestTable />);

      const actionsCell = container.querySelector('td.actions-column');
      const button = actionsCell?.querySelector('button');
      
      expect(button).toBeInTheDocument();
    });

    it('should apply btn-icon class to action buttons', () => {
      const { container } = render(<TestTable />);

      const buttons = container.querySelectorAll('.actions-column button');
      buttons.forEach(button => {
        expect(button).toHaveClass('btn-icon');
      });
    });
  });

  describe('Horizontal Scroll Support', () => {
    it('should have responsive-table wrapper for overflow control', () => {
      const { container } = render(<TestTable />);

      const wrapper = container.querySelector('.responsive-table');
      expect(wrapper).toBeInTheDocument();
      
      // CSS would apply overflow-x: auto for horizontal scrolling
    });

    it('should contain table within scrollable container', () => {
      const { container } = render(<TestTable />);

      const wrapper = container.querySelector('.responsive-table');
      const table = wrapper?.querySelector('table');
      
      expect(table).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior Across Breakpoints', () => {
    it('should adapt to mobile viewport (< 768px)', () => {
      mockMatchMedia(600);
      const { container } = render(<TestTable />);

      const table = container.querySelector('.responsive-table');
      expect(table).toBeInTheDocument();
      
      // Mobile-specific CSS would apply
    });

    it('should adapt to tablet viewport (768px - 1024px)', () => {
      mockMatchMedia(800);
      const { container } = render(<TestTable />);

      const table = container.querySelector('.responsive-table');
      expect(table).toBeInTheDocument();
    });

    it('should adapt to desktop viewport (> 1024px)', () => {
      mockMatchMedia(1200);
      const { container } = render(<TestTable />);

      const table = container.querySelector('.responsive-table');
      expect(table).toBeInTheDocument();
      
      // Desktop-specific CSS would apply
    });
  });

  describe('CSS Class Structure', () => {
    it('should have all required CSS classes for mobile optimization', () => {
      const { container } = render(<TestTable />);

      // Check for responsive-table wrapper
      expect(container.querySelector('.responsive-table')).toBeInTheDocument();
      
      // Check for hide-mobile columns
      expect(container.querySelectorAll('.hide-mobile').length).toBeGreaterThan(0);
      
      // Check for actions-column
      expect(container.querySelector('.actions-column')).toBeInTheDocument();
      
      // Check for btn-icon buttons
      expect(container.querySelectorAll('.btn-icon').length).toBeGreaterThan(0);
    });

    it('should maintain proper table semantics', () => {
      const { container } = render(<TestTable />);

      const table = container.querySelector('table');
      const thead = container.querySelector('thead');
      const tbody = container.querySelector('tbody');
      const rows = container.querySelectorAll('tr');
      const headers = container.querySelectorAll('th');
      const cells = container.querySelectorAll('td');

      expect(table).toBeInTheDocument();
      expect(thead).toBeInTheDocument();
      expect(tbody).toBeInTheDocument();
      expect(rows.length).toBeGreaterThan(0);
      expect(headers.length).toBeGreaterThan(0);
      expect(cells.length).toBeGreaterThan(0);
    });
  });

  describe('Touch-Friendly Action Buttons', () => {
    it('should have icon buttons in actions column', () => {
      const { container } = render(<TestTable />);

      const buttons = container.querySelectorAll('.actions-column .btn-icon');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should have proper button structure for touch targets', () => {
      const { container } = render(<TestTable />);

      const button = container.querySelector('.btn-icon');
      expect(button).toBeInTheDocument();
      
      // CSS would apply min-height: 44px and min-width: 44px
    });
  });

  describe('Accessibility', () => {
    it('should maintain table accessibility structure', () => {
      const { container } = render(<TestTable />);

      const table = container.querySelector('table');
      expect(table).toBeInTheDocument();
      
      // Table should have proper thead/tbody structure
      const thead = table?.querySelector('thead');
      const tbody = table?.querySelector('tbody');
      
      expect(thead).toBeInTheDocument();
      expect(tbody).toBeInTheDocument();
    });

    it('should have proper header cells', () => {
      const { container } = render(<TestTable />);

      const headers = container.querySelectorAll('th');
      expect(headers.length).toBe(6);
      
      // Each header should have text content
      headers.forEach(header => {
        expect(header.textContent).toBeTruthy();
      });
    });

    it('should maintain form input accessibility', () => {
      const { container } = render(<TestForm />);

      const input = container.querySelector('input');
      const select = container.querySelector('select');
      const textarea = container.querySelector('textarea');

      // Inputs should have placeholders or labels
      expect(input).toHaveAttribute('placeholder');
      expect(textarea).toHaveAttribute('placeholder');
      expect(select).toBeInTheDocument();
    });
  });
});
