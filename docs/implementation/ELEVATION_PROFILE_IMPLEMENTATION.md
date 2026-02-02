# Elevation Profile Implementation

## Overview

This document describes the implementation of elevation profile support for the Line of Sight analysis tool in the Meshtastic Node Mapper application.

**Requirements Implemented:** 40.7, 40.11, 40.12

## Features Implemented

### 1. Elevation Data Fetching
- Integration with Open-Elevation API for terrain elevation data
- Configurable API endpoint (supports Open-Elevation, USGS, or custom APIs)
- Interpolation of sample points along the path between two nodes
- Error handling for API failures and invalid coordinates
- Configurable maximum sample points (default: 50, max: 100)

### 2. Fresnel Zone Calculation
- First Fresnel zone radius calculation using standard RF propagation formulas
- Support for different frequencies (default: 915 MHz for Meshtastic)
- Calculation of Fresnel zone clearance at each point along the path
- Line-of-sight elevation calculation with linear interpolation

### 3. Obstruction Detection
- Detection of terrain obstructions that intrude into the Fresnel zone
- Clearance percentage calculation (percentage of path with clear Fresnel zone)
- Identification of specific obstructed points with clearance values
- Visual highlighting of potential terrain obstructions

### 4. Configuration Support
- Optional/configurable elevation service via `config/app.yml`
- Enable/disable elevation service
- Custom API URL configuration
- Maximum sample points configuration

## Implementation Details

### Backend Components

#### ElevationProfileService (`backend/src/services/elevation-profile.service.ts`)
- Core service for elevation profile functionality
- Methods:
  - `getElevationProfile()`: Fetch elevation data for a path
  - `calculateFresnelZoneRadius()`: Calculate Fresnel zone radius at a point
  - `calculateFresnelClearance()`: Calculate clearance for entire profile
  - `detectObstructions()`: Analyze obstructions in the path
  - `calculateLineOfSightElevation()`: Calculate LOS elevation at a point

#### API Endpoint (`backend/src/routes/line-of-sight.ts`)
- New endpoint: `GET /api/analysis/line-of-sight/elevation`
- Query parameters:
  - `lat1`, `lon1`: Starting coordinates (required)
  - `lat2`, `lon2`: Ending coordinates (required)
  - `samples`: Number of sample points (optional, default 50)
  - `frequency`: Frequency in MHz (optional, default 915)
- Returns:
  - Elevation profile points
  - Fresnel zone analysis
  - Obstruction detection results

#### Tests (`backend/src/__tests__/elevation-profile.test.ts`)
- 16 comprehensive unit tests covering:
  - Elevation data fetching
  - Fresnel zone calculations
  - Obstruction detection
  - Configuration management
  - Error handling

### Frontend Components

#### LineOfSightPage Updates (`frontend/src/pages/LineOfSightPage.tsx`)
- Added elevation profile toggle switch
- Integrated Chart.js for elevation profile visualization
- Display of elevation statistics:
  - Minimum/maximum elevation
  - Elevation gain
  - Minimum clearance
- Visual chart showing:
  - Terrain elevation (filled area)
  - Line of sight (dashed line)
  - Fresnel zone boundaries (upper and lower)
- Obstruction warnings and alerts
- Loading states and error handling

### Configuration

#### app.yml Configuration
```yaml
elevation:
  enabled: true
  apiUrl: "https://api.open-elevation.com/api/v1/lookup"
  maxSamplePoints: 100
```

## Usage

### For Users

1. Navigate to the Line of Sight analysis page
2. Select two nodes to analyze
3. Click "Analyze" to calculate distance and connectivity
4. Toggle "Show Elevation Profile" to fetch and display terrain data
5. Review the elevation chart and obstruction warnings

### For Administrators

1. Configure elevation service in `config/app.yml`
2. Set `enabled: true` to enable the service
3. Optionally configure a custom API URL
4. Adjust `maxSamplePoints` for performance tuning

## Technical Details

### Fresnel Zone Formula

The first Fresnel zone radius is calculated using:

```
r = sqrt((λ * d1 * d2) / (d1 + d2))
```

Where:
- `r` = Fresnel zone radius (meters)
- `λ` = wavelength (meters) = c / frequency
- `d1` = distance from first endpoint to point (meters)
- `d2` = distance from point to second endpoint (meters)
- `c` = speed of light (299,792,458 m/s)

### Clearance Calculation

Clearance is calculated as:

```
clearance = (LOS_elevation - terrain_elevation) - fresnel_radius
```

- Positive clearance = clear path
- Negative clearance = obstruction

For optimal RF signal quality, at least 60% of the first Fresnel zone should be clear.

### API Integration

The service uses the Open-Elevation API by default:
- Endpoint: `https://api.open-elevation.com/api/v1/lookup`
- Method: POST
- Request body: `{ "locations": [{ "latitude": X, "longitude": Y }, ...] }`
- Response: `{ "results": [{ "latitude": X, "longitude": Y, "elevation": Z }, ...] }`

## Performance Considerations

1. **Sample Points**: Limited to 100 points maximum to prevent excessive API calls
2. **Caching**: Consider implementing caching for frequently analyzed paths
3. **API Availability**: Open-Elevation API may be slow or unavailable; consider self-hosting
4. **Rate Limiting**: API requests are subject to rate limiting middleware

## Future Enhancements

1. **Caching**: Implement Redis caching for elevation data
2. **Alternative APIs**: Add support for USGS and other elevation APIs
3. **3D Visualization**: Add 3D terrain visualization using Three.js
4. **Antenna Height**: Factor in antenna heights for more accurate analysis
5. **Earth Curvature**: Account for earth curvature on long-distance links
6. **Multiple Frequencies**: Support analysis at multiple frequencies simultaneously

## Testing

All tests pass successfully:
- 16 unit tests for backend service
- Coverage includes:
  - Elevation data fetching
  - Fresnel zone calculations
  - Obstruction detection
  - Configuration management
  - Error handling

Run tests with:
```bash
cd backend
npm test -- elevation-profile.test.ts
```

## Dependencies

### Backend
- `js-yaml`: YAML configuration parsing
- `node-fetch`: HTTP requests (built-in in Node.js 18+)

### Frontend
- `chart.js`: Chart rendering
- `react-chartjs-2`: React wrapper for Chart.js
- `@mui/material`: UI components

## References

- [Fresnel Zone Wikipedia](https://en.wikipedia.org/wiki/Fresnel_zone)
- [Open-Elevation API](https://open-elevation.com/)
- [RF Line of Sight Calculations](https://www.everythingrf.com/rf-calculators/fresnel-zone-calculator)
- [Meshtastic Documentation](https://meshtastic.org/docs/)

## Status

✅ **COMPLETE** - All requirements implemented and tested
- Requirement 40.7: Elevation profile display ✅
- Requirement 40.11: First Fresnel zone clearance calculation ✅
- Requirement 40.12: Terrain obstruction highlighting ✅
