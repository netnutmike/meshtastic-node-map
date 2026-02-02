/**
 * Chart theme utilities for theme-aware color management
 * Provides functions to get colors from CSS custom properties and apply them to charts
 * 
 * Requirements: 35.8, 35.11
 */

export interface ChartColors {
  textColor: string;
  gridColor: string;
  primary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  secondary: string;
}

/**
 * Get theme-aware colors from CSS custom properties
 * @returns Object containing all theme colors
 */
export function getChartColors(): ChartColors {
  const computedStyle = getComputedStyle(document.documentElement);
  const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';

  return {
    textColor: computedStyle.getPropertyValue('--bs-body-color').trim() || (isDark ? '#f8f9fa' : '#212529'),
    gridColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    primary: computedStyle.getPropertyValue('--bs-primary').trim() || '#0d6efd',
    success: computedStyle.getPropertyValue('--bs-success').trim() || '#198754',
    warning: computedStyle.getPropertyValue('--bs-warning').trim() || '#ffc107',
    danger: computedStyle.getPropertyValue('--bs-danger').trim() || '#dc3545',
    info: computedStyle.getPropertyValue('--bs-info').trim() || '#0dcaf0',
    secondary: computedStyle.getPropertyValue('--bs-secondary').trim() || '#6c757d',
  };
}

/**
 * Apply theme colors to Chart.js options
 * @param baseOptions - Base chart options to extend
 * @returns Chart options with theme colors applied
 */
export function applyThemeToChartOptions(baseOptions: any): any {
  const colors = getChartColors();

  return {
    ...baseOptions,
    plugins: {
      ...baseOptions.plugins,
      legend: {
        ...baseOptions.plugins?.legend,
        labels: {
          ...baseOptions.plugins?.legend?.labels,
          color: colors.textColor,
        },
      },
      tooltip: {
        ...baseOptions.plugins?.tooltip,
        backgroundColor: colors.gridColor === 'rgba(255, 255, 255, 0.1)' 
          ? 'rgba(0, 0, 0, 0.8)' 
          : 'rgba(255, 255, 255, 0.9)',
        titleColor: colors.textColor,
        bodyColor: colors.textColor,
        borderColor: colors.gridColor,
        borderWidth: 1,
      },
    },
    scales: baseOptions.scales ? {
      ...Object.keys(baseOptions.scales).reduce((acc, scaleKey) => {
        acc[scaleKey] = {
          ...baseOptions.scales[scaleKey],
          ticks: {
            ...baseOptions.scales[scaleKey]?.ticks,
            color: colors.textColor,
          },
          grid: {
            ...baseOptions.scales[scaleKey]?.grid,
            color: colors.gridColor,
          },
        };
        return acc;
      }, {} as any),
    } : undefined,
  };
}

/**
 * Get a color from the theme palette
 * @param colorName - Name of the color (primary, success, warning, danger, info, secondary)
 * @returns Hex color string
 */
export function getThemeColor(colorName: keyof Omit<ChartColors, 'textColor' | 'gridColor'>): string {
  const colors = getChartColors();
  return colors[colorName];
}
