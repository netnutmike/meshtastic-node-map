/**
 * Map theme utilities for theme-aware tile layer management
 * Provides functions to get appropriate map tile layers based on current theme
 * 
 * Requirements: 35.9, 35.11
 */

export interface TileLayerConfig {
  url: string;
  attribution: string;
  maxZoom: number;
}

export const TILE_LAYERS = {
  // Light theme tile layers
  cartolight: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  },
  openstreetmap: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  opentopomap: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    maxZoom: 17,
  },
  
  // Dark theme tile layers
  cartodark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  },
  
  // Satellite layers (work well with both themes)
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18,
  },
  googlesatellite: {
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '&copy; Google',
    maxZoom: 20,
  },
  googlehybrid: {
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google',
    maxZoom: 20,
  },
};

/**
 * Get the current effective theme
 * @returns 'light' or 'dark'
 */
export function getCurrentTheme(): 'light' | 'dark' {
  const theme = document.documentElement.getAttribute('data-bs-theme');
  return theme === 'dark' ? 'dark' : 'light';
}

/**
 * Get the appropriate tile layer for the current theme
 * @param preferredLayer - Optional preferred layer name (e.g., 'openstreetmap', 'satellite')
 * @returns Tile layer configuration
 */
export function getTileLayerForTheme(preferredLayer?: string): TileLayerConfig {
  const theme = getCurrentTheme();
  
  // If a specific layer is requested, return it
  if (preferredLayer && TILE_LAYERS[preferredLayer as keyof typeof TILE_LAYERS]) {
    return TILE_LAYERS[preferredLayer as keyof typeof TILE_LAYERS];
  }
  
  // Otherwise, return theme-appropriate default
  return theme === 'dark' ? TILE_LAYERS.cartodark : TILE_LAYERS.cartolight;
}

/**
 * Get the default tile layer name for the current theme
 * @returns Tile layer name
 */
export function getDefaultTileLayerName(): string {
  const theme = getCurrentTheme();
  return theme === 'dark' ? 'cartodark' : 'cartolight';
}

/**
 * Check if a tile layer is theme-specific (light or dark)
 * @param layerName - Name of the tile layer
 * @returns true if the layer is theme-specific
 */
export function isThemeSpecificLayer(layerName: string): boolean {
  return layerName === 'cartolight' || layerName === 'cartodark';
}

/**
 * Get the opposite theme's tile layer
 * @param currentLayer - Current tile layer name
 * @returns Opposite theme's tile layer name
 */
export function getOppositeThemeLayer(currentLayer: string): string {
  if (currentLayer === 'cartolight') return 'cartodark';
  if (currentLayer === 'cartodark') return 'cartolight';
  return currentLayer; // Return same layer if not theme-specific
}
