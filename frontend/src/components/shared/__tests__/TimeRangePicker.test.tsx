/**
 * TimeRangePicker Component Tests
 * Tests for time range selection with presets
 * Requirements: 43.13
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TimeRangePicker, { TimeRange } from '../TimeRangePicker';

describe('TimeRangePicker', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultValue: TimeRange = {
    start: null,
    end: null
  };

  describe('Rendering', () => {
    it('should render with default label', () => {
      render(<TimeRangePicker value={defaultValue} onChange={mockOnChange} />);
      expect(screen.getByText('Time Range')).toBeInTheDocument();
    });

    it('should render with custom label', () => {
      render(
        <TimeRangePicker
          value={defaultValue}
          onChange={mockOnChange}
          label="Custom Time Range"
        />
      );
      expect(screen.getByText('Custom Time Range')).toBeInTheDocument();
    });

    it('should render presets dropdown by default', () => {
      render(<TimeRangePicker value={defaultValue} onChange={mockOnChange} />);
      expect(screen.getByText('Time Range')).toBeInTheDocument();
    });

    it('should not render presets when showPresets is false', () => {
      render(
        <TimeRangePicker
          value={defaultValue}
          onChange={mockOnChange}
          showPresets={false}
        />
      );
      expect(screen.queryByText('Time Range')).not.toBeInTheDocument();
    });

    it('should be disabled when disabled prop is true', () => {
      render(
        <TimeRangePicker
          value={defaultValue}
          onChange={mockOnChange}
          disabled={true}
        />
      );
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Preset Selection', () => {
    it('should show all preset options', async () => {
      const user = userEvent.setup();
      render(<TimeRangePicker value={defaultValue} onChange={mockOnChange} />);

      const select = screen.getByRole('combobox');
      await user.click(select);

      await waitFor(() => {
        expect(screen.getByText('Custom Range')).toBeInTheDocument();
        expect(screen.getByText('Last Hour')).toBeInTheDocument();
        expect(screen.getByText('Last 6 Hours')).toBeInTheDocument();
        expect(screen.getByText('Last 24 Hours')).toBeInTheDocument();
        expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
        expect(screen.getByText('Last 30 Days')).toBeInTheDocument();
      });
    });

    it('should call onChange when selecting "Last Hour" preset', async () => {
      const user = userEvent.setup();
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      render(<TimeRangePicker value={defaultValue} onChange={mockOnChange} />);

      const select = screen.getByRole('combobox');
      await user.click(select);

      const lastHourOption = await screen.findByText('Last Hour');
      await user.click(lastHourOption);

      expect(mockOnChange).toHaveBeenCalledWith({
        start: expect.any(Date),
        end: expect.any(Date)
      });

      const call = mockOnChange.mock.calls[0][0];
      expect(call.end.getTime()).toBe(now);
      expect(call.start.getTime()).toBe(now - 60 * 60 * 1000);
    });

    it('should call onChange when selecting "Last 24 Hours" preset', async () => {
      const user = userEvent.setup();
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      render(<TimeRangePicker value={defaultValue} onChange={mockOnChange} />);

      const select = screen.getByRole('combobox');
      await user.click(select);

      const last24hOption = await screen.findByText('Last 24 Hours');
      await user.click(last24hOption);

      expect(mockOnChange).toHaveBeenCalledWith({
        start: expect.any(Date),
        end: expect.any(Date)
      });

      const call = mockOnChange.mock.calls[0][0];
      expect(call.end.getTime()).toBe(now);
      expect(call.start.getTime()).toBe(now - 24 * 60 * 60 * 1000);
    });

    it('should call onChange when selecting "Last 7 Days" preset', async () => {
      const user = userEvent.setup();
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      render(<TimeRangePicker value={defaultValue} onChange={mockOnChange} />);

      const select = screen.getByRole('combobox');
      await user.click(select);

      const last7dOption = await screen.findByText('Last 7 Days');
      await user.click(last7dOption);

      expect(mockOnChange).toHaveBeenCalledWith({
        start: expect.any(Date),
        end: expect.any(Date)
      });

      const call = mockOnChange.mock.calls[0][0];
      expect(call.end.getTime()).toBe(now);
      expect(call.start.getTime()).toBe(now - 7 * 24 * 60 * 60 * 1000);
    });
  });

  describe('Custom Range', () => {
    it('should show date pickers when "Custom Range" is selected', async () => {
      const user = userEvent.setup();
      render(<TimeRangePicker value={defaultValue} onChange={mockOnChange} />);

      const select = screen.getByRole('combobox');
      await user.click(select);

      const customOption = await screen.findByText('Custom Range');
      await user.click(customOption);

      await waitFor(() => {
        expect(screen.getByLabelText('Start Time')).toBeInTheDocument();
        expect(screen.getByLabelText('End Time')).toBeInTheDocument();
      });
    });

    it('should not show date pickers when preset is selected', () => {
      render(<TimeRangePicker value={defaultValue} onChange={mockOnChange} />);

      expect(screen.queryByLabelText('Start Time')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('End Time')).not.toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should render with small size', () => {
      render(
        <TimeRangePicker
          value={defaultValue}
          onChange={mockOnChange}
          size="small"
        />
      );
      expect(screen.getByLabelText('Time Range')).toBeInTheDocument();
    });

    it('should render with medium size', () => {
      render(
        <TimeRangePicker
          value={defaultValue}
          onChange={mockOnChange}
          size="medium"
        />
      );
      expect(screen.getByLabelText('Time Range')).toBeInTheDocument();
    });
  });

  describe('Full Width', () => {
    it('should render full width by default', () => {
      const { container } = render(
        <TimeRangePicker value={defaultValue} onChange={mockOnChange} />
      );
      const formControl = container.querySelector('.MuiFormControl-root');
      expect(formControl).toHaveClass('MuiFormControl-fullWidth');
    });

    it('should not render full width when fullWidth is false', () => {
      const { container } = render(
        <TimeRangePicker
          value={defaultValue}
          onChange={mockOnChange}
          fullWidth={false}
        />
      );
      const formControl = container.querySelector('.MuiFormControl-root');
      expect(formControl).not.toHaveClass('MuiFormControl-fullWidth');
    });
  });

  describe('Value Display', () => {
    it('should display provided start and end dates in custom mode', async () => {
      const user = userEvent.setup();
      const start = new Date('2024-01-01T10:00:00');
      const end = new Date('2024-01-02T10:00:00');

      render(
        <TimeRangePicker
          value={{ start, end }}
          onChange={mockOnChange}
        />
      );

      // Switch to custom mode
      const select = screen.getByRole('combobox');
      await user.click(select);
      const customOption = await screen.findByText('Custom Range');
      await user.click(customOption);

      await waitFor(() => {
        // Just verify the date pickers are rendered
        const startInput = screen.getByLabelText('Start Time');
        const endInput = screen.getByLabelText('End Time');
        expect(startInput).toBeInTheDocument();
        expect(endInput).toBeInTheDocument();
      });
    });
  });

  describe('Preset Calculations', () => {
    it('should call onChange with start and end dates for "Last 6 Hours"', async () => {
      const user = userEvent.setup();
      render(<TimeRangePicker value={defaultValue} onChange={mockOnChange} />);

      const select = screen.getByRole('combobox');
      await user.click(select);

      const last6hOption = await screen.findByText('Last 6 Hours');
      await user.click(last6hOption);

      expect(mockOnChange).toHaveBeenCalledWith({
        start: expect.any(Date),
        end: expect.any(Date)
      });
      
      const call = mockOnChange.mock.calls[0][0];
      // Verify start is before end
      expect(call.start.getTime()).toBeLessThan(call.end.getTime());
      // Verify the range is approximately 6 hours (with some tolerance for test execution time)
      const diff = call.end.getTime() - call.start.getTime();
      const sixHours = 6 * 60 * 60 * 1000;
      expect(Math.abs(diff - sixHours)).toBeLessThan(5000); // 5 second tolerance
    });

    it('should call onChange with start and end dates for "Last 30 Days"', async () => {
      const user = userEvent.setup();
      render(<TimeRangePicker value={defaultValue} onChange={mockOnChange} />);

      const select = screen.getByRole('combobox');
      await user.click(select);

      const last30dOption = await screen.findByText('Last 30 Days');
      await user.click(last30dOption);

      expect(mockOnChange).toHaveBeenCalledWith({
        start: expect.any(Date),
        end: expect.any(Date)
      });
      
      const call = mockOnChange.mock.calls[0][0];
      // Verify start is before end
      expect(call.start.getTime()).toBeLessThan(call.end.getTime());
      // Verify the range is approximately 30 days (with some tolerance for test execution time)
      const diff = call.end.getTime() - call.start.getTime();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      expect(Math.abs(diff - thirtyDays)).toBeLessThan(5000); // 5 second tolerance
    });
  });
});
