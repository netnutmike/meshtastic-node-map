import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { useSelector, useDispatch } from 'react-redux';
import { Box } from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RootState } from '../../store';
import { setCenter, setZoom, closeTopologyGraph } from '../../store/slices/mapSlice';
import NodeMarkers from './NodeMarkers';
import NetworkTopologyGraph from './NetworkTopologyGraph';
import MapOptions from './MapOptions';
import MapLegend from './MapLegend';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const TILE_LAYERS = {
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
  cartolight: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  },
  cartodark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  },
};

// Component to handle map events and sync with Redux
const MapEventHandler: React.FC = () => {
  const dispatch = useDispatch();
  const map = useMap();

  useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      dispatch(setCenter([center.lat, center.lng]));
    },
    zoomend: () => {
      dispatch(setZoom(map.getZoom()));
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
}

const MapComponent: React.FC<MapComponentProps> = ({ height = '100vh', onOpenMapOptions }) => {
  const dispatch = useDispatch();
  const { center, zoom, tileLayer, topologyGraphOpen } = useSelector((state: RootState) => state.map);
  const [mapOptionsOpen, setMapOptionsOpen] = useState(false);
  
  const selectedTileLayer = TILE_LAYERS[tileLayer as keyof typeof TILE_LAYERS] || TILE_LAYERS.openstreetmap;

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
        zoomControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        touchZoom={true}
        dragging={true}
        keyboard={true}
        boxZoom={true}
        trackResize={true}
        worldCopyJump={false}
        closePopupOnClick={true}
        bounceAtZoomLimits={true}
        wheelPxPerZoomLevel={60}
        zoomAnimation={true}
        fadeAnimation={true}
        markerZoomAnimation={true}
      >
        <TileLayer
          key={tileLayer} // Force re-render when tile layer changes
          url={selectedTileLayer.url}
          attribution={selectedTileLayer.attribution}
          maxZoom={selectedTileLayer.maxZoom}
          minZoom={1}
          tileSize={256}
          zoomOffset={0}
          detectRetina={true}
          updateWhenIdle={false}
          updateWhenZooming={true}
          keepBuffer={2}
        />
        
        <MapEventHandler />
        <MapViewController />
        <NodeMarkers />
      </MapContainer>
      
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
      
      {/* Map Legend */}
      <MapLegend />
    </Box>
  );
};

export default MapComponent;