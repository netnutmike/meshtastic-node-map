import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { useSelector, useDispatch } from 'react-redux';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RootState } from '../../store';
import { setCenter, setZoom, closeTopologyGraph } from '../../store/slices/mapSlice';
import NodeMarkers from './NodeMarkers';
import NetworkTopologyGraph from './NetworkTopologyGraph';
import MapOptions from './MapOptions';
import MapLegend from './MapLegend';
import MapDebugInfo from './MapDebugInfo';
import RFLinks from './RFLinks';
import { MobileControls } from '../Mobile';
import { TILE_LAYERS, getCurrentTheme, isThemeSpecificLayer, getOppositeThemeLayer } from '../../utils/mapTheme';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Component to handle map events and sync with Redux
const MapEventHandler: React.FC = () => {
  const dispatch = useDispatch();
  const map = useMap();
  const lastCenter = useRef<[number, number] | null>(null);
  const lastZoom = useRef<number | null>(null);

  useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      const newCenter: [number, number] = [center.lat, center.lng];
      
      // Only dispatch if center actually changed significantly (more than 0.0001 degrees)
      if (!lastCenter.current || 
          Math.abs(lastCenter.current[0] - newCenter[0]) > 0.0001 ||
          Math.abs(lastCenter.current[1] - newCenter[1]) > 0.0001) {
        lastCenter.current = newCenter;
        dispatch(setCenter(newCenter));
      }
    },
    zoomend: () => {
      const newZoom = map.getZoom();
      
      // Only dispatch if zoom actually changed
      if (lastZoom.current !== newZoom) {
        lastZoom.current = newZoom;
        dispatch(setZoom(newZoom));
      }
    },
    click: (e) => {
      // Handle map clicks for future features (e.g., adding waypoints)
      console.log('Map clicked at:', e.latlng);
    },
    contextmenu: (e) => {
      // Handle right-click for context menu
      e.originalEvent.preventDefault();
    },
  });

  return null;
};

// Component to update map view when Redux state changes
const MapViewController: React.FC = () => {
  const map = useMap();
  const { center, zoom } = useSelector((state: RootState) => state.map);
  const prevCenter = useRef<[number, number]>(center);
  const prevZoom = useRef<number>(zoom);

  useEffect(() => {
    // Only update if the values actually changed to avoid infinite loops
    if (
      prevCenter.current[0] !== center[0] ||
      prevCenter.current[1] !== center[1] ||
      prevZoom.current !== zoom
    ) {
      map.setView(center, zoom);
      prevCenter.current = center;
      prevZoom.current = zoom;
    }
  }, [map, center, zoom]);

  return null;
};

interface MapComponentProps {
  height?: string | number;
  onOpenMapOptions?: () => void;
  onOpenSearch?: () => void;
  onOpenSettings?: () => void;
}

const MapComponent: React.FC<MapComponentProps> = ({ 
  height = '100vh', 
  onOpenMapOptions,
  onOpenSearch,
  onOpenSettings 
}) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const { center, zoom, tileLayer, topologyGraphOpen } = useSelector((state: RootState) => state.map);
  const { showDebugInfo } = useSelector((state: RootState) => state.settings);
  const [mapOptionsOpen, setMapOptionsOpen] = useState(false);
  const [currentTileLayer, setCurrentTileLayer] = useState(tileLayer);
  
  const selectedTileLayer = TILE_LAYERS[currentTileLayer as keyof typeof TILE_LAYERS] || TILE_LAYERS.openstreetmap;

  // Listen for theme changes and update tile layer if it's theme-specific
  useEffect(() => {
    const handleThemeChange = () => {
      const currentTheme = getCurrentTheme();
      
      // If current layer is theme-specific, switch to the appropriate one
      if (isThemeSpecificLayer(currentTileLayer)) {
        const newLayer = currentTheme === 'dark' ? 'cartodark' : 'cartolight';
        if (newLayer !== currentTileLayer) {
          setCurrentTileLayer(newLayer);
        }
      }
    };

    window.addEventListener('themeChanged', handleThemeChange);
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
    };
  }, [currentTileLayer]);

  // Sync with Redux state
  useEffect(() => {
    setCurrentTileLayer(tileLayer);
  }, [tileLayer]);

  // Handle external map options open request
  useEffect(() => {
    if (onOpenMapOptions) {
      // This is a bit of a hack, but we need to expose the open function
      (window as any).openMapOptions = () => setMapOptionsOpen(true);
    }
  }, [onOpenMapOptions]);

  return (
    <Box sx={{ height, width: '100%', position: 'relative' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={!isMobile} // Hide default zoom controls on mobile
        scrollWheelZoom={true}
        doubleClickZoom={true}
        touchZoom={true}
        dragging={true}
        keyboard={!isMobile} // Disable keyboard controls on mobile
        boxZoom={!isMobile} // Disable box zoom on mobile
        trackResize={true}
        worldCopyJump={false}
        closePopupOnClick={true}
        bounceAtZoomLimits={true}
        wheelPxPerZoomLevel={60}
        zoomAnimation={true}
        fadeAnimation={true}
        markerZoomAnimation={true}
        // Mobile-specific options
        zoomSnap={isMobile ? 0.5 : 1}
        zoomDelta={isMobile ? 0.5 : 1}
      >
        <TileLayer
          key={`${currentTileLayer}-${getCurrentTheme()}`} // Force re-render when tile layer or theme changes
          url={selectedTileLayer.url}
          attribution={selectedTileLayer.attribution}
          maxZoom={selectedTileLayer.maxZoom}
          minZoom={1}
          tileSize={256}
          zoomOffset={0}
          detectRetina={true}
          updateWhenIdle={false}
          updateWhenZooming={true}
          keepBuffer={isMobile ? 1 : 2} // Reduce buffer on mobile for performance
          crossOrigin={true}
        />
        
        <MapEventHandler />
        <MapViewController />
        <NodeMarkers />
        <RFLinks />
      </MapContainer>
      
      {/* Debug Info - Conditionally shown based on settings */}
      {showDebugInfo && <MapDebugInfo />}
      
      {/* Mobile Controls */}
      <MobileControls
        onOpenSearch={onOpenSearch}
        onOpenSettings={onOpenSettings}
        onOpenMapOptions={() => setMapOptionsOpen(true)}
      />
      
      {/* Network Topology Graph Modal */}
      <NetworkTopologyGraph
        isOpen={topologyGraphOpen}
        onClose={() => dispatch(closeTopologyGraph())}
      />
      
      {/* Map Options Panel */}
      <MapOptions
        isOpen={mapOptionsOpen}
        onClose={() => setMapOptionsOpen(false)}
      />
      
      {/* Map Legend - Hide on mobile when controls are visible */}
      {!isMobile && <MapLegend />}
    </Box>
  );
};

export default MapComponent;