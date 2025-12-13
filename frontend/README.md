# Meshtastic Node Mapper Frontend

This is the React-based frontend for the Meshtastic Node Mapper application.

## Features Implemented

### Task 5: Frontend Project Setup and Basic Map Implementation

✅ **Completed Components:**

1. **React Project with TypeScript** - Modern React 18 setup with full TypeScript support
2. **Leaflet.js Integration** - Interactive mapping with OpenStreetMap tiles
3. **Basic Map Component** - Functional map with zoom controls and tile layers
4. **Responsive Layout** - Navigation header with search and action buttons
5. **Redux State Management** - Centralized state management with Redux Toolkit
6. **React Router** - Basic routing setup for future pages

### Key Components

- **MapComponent** - Interactive Leaflet map with node visualization
- **NodeMarkers** - Renders nodes as colored dots based on connection status
- **NavigationHeader** - Top navigation with search, settings, and action buttons
- **Redux Store** - State management for map, nodes, and settings

### Node Status Color Coding

- 🟢 **Green** - Node is online and MQTT connected
- 🔵 **Blue** - Node is online but MQTT disconnected  
- 🔴 **Red** - Node is offline

### Property-Based Testing

✅ **Property Test Implemented:**
- **Property 1: Node rendering with position data** - Validates that nodes with valid GPS coordinates appear on the map as colored dots
- Uses fast-check library with 50+ test iterations
- Tests map initialization, tile layer rendering, and node marker placement

## Available Scripts

- `npm start` - Start development server
- `npm test` - Run test suite
- `npm run build` - Build for production
- `npm run lint` - Run ESLint

## Technology Stack

- **React 18** with TypeScript
- **Material-UI** for UI components
- **Leaflet.js** for mapping
- **Redux Toolkit** for state management
- **React Router** for navigation
- **fast-check** for property-based testing

## Mock Data

The application currently uses mock node data for testing and development. This includes sample nodes in the NYC area with different hardware types and connection states.

## Next Steps

The frontend is ready for integration with the backend API and implementation of additional features like:
- Real-time WebSocket updates
- Node details panels
- Settings management
- Search and filtering
- Telemetry visualization