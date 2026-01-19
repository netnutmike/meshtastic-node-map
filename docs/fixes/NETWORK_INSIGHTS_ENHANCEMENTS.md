# Network Insights Page Enhancements

## Overview
Added two new features to the Network Insights Statistics tab:
1. **Database Overview** - Shows record counts for all database tables
2. **MQTT Message Timeline** - Time-series graph showing message volume in 15-minute intervals over 3 days

## Changes Made

### Backend Changes

#### 1. New API Endpoints (`backend/src/routes/statistics.ts`)

**GET /api/v1/statistics/database-overview**
- Returns record counts for all database tables
- No authentication required (uses `optionalAuth`)
- Rate limited

**GET /api/v1/statistics/message-timeline**
- Returns time-series data of MQTT messages
- Query parameters:
  - `networkId` (optional): Filter by network
  - `days` (optional, default: 3): Number of days to look back
  - `intervalMinutes` (optional, default: 15): Time bucket size in minutes
- Uses TimescaleDB's `time_bucket` function for efficient aggregation

#### 2. New Service Methods (`backend/src/services/statistics.service.ts`)

**getDatabaseOverview()**
```typescript
{
  tables: {
    networks: number,
    nodes: number,
    positions: number,
    telemetryReadings: number,
    messages: number,
    nodeNeighbors: number,
    channels: number
  },
  total: number,
  generatedAt: Date
}
```

**getMessageTimeline(networkId?, days, intervalMinutes)**
```typescript
{
  startDate: Date,
  endDate: Date,
  intervalMinutes: number,
  dataPoints: Array<{
    timestamp: Date,
    count: number
  }>
}
```

Uses raw SQL with TimescaleDB's `time_bucket` function:
```sql
SELECT 
  time_bucket(INTERVAL '15 minutes', timestamp) as time_bucket,
  COUNT(*) as count
FROM messages
WHERE timestamp >= $startDate AND timestamp <= $endDate
GROUP BY time_bucket
ORDER BY time_bucket ASC
```

### Frontend Changes

#### 1. API Service Methods (`frontend/src/services/api.ts`)

Added two new methods:
- `getDatabaseOverview()`: Fetches database table counts
- `getMessageTimeline(options)`: Fetches message timeline data

#### 2. NetworkInsightsPage Updates (`frontend/src/pages/NetworkInsightsPage.tsx`)

**New State Variables:**
```typescript
const [databaseOverview, setDatabaseOverview] = useState<any>(null);
const [messageTimeline, setMessageTimeline] = useState<any>(null);
```

**New Load Functions:**
- `loadDatabaseOverview()`: Fetches and sets database overview data
- `loadMessageTimeline()`: Fetches message timeline for last 3 days with 15-minute intervals

**New UI Components in Statistics Tab:**

1. **Database Overview Panel**
   - Shows total record count across all tables
   - Grid layout displaying each table's record count
   - Responsive design (auto-fit columns)
   - Format: "Networks: 5", "Nodes: 437", etc.

2. **MQTT Message Timeline Panel**
   - Bar chart showing message volume over time
   - X-axis: Time (formatted as "Jan 15, 02:00 PM")
   - Y-axis: Message count
   - 15-minute intervals over 3 days
   - Angled labels for better readability
   - Responsive container (100% width, 300px height)

## Features

### Database Overview
- **Purpose**: Provides quick insight into database size and data distribution
- **Tables Tracked**:
  - Networks
  - Nodes
  - Positions
  - Telemetry Readings
  - Messages
  - Node Neighbors
  - Channels
- **Display**: Grid layout with individual cards for each table
- **Total**: Sum of all records across all tables

### MQTT Message Timeline
- **Purpose**: Visualize message traffic patterns over time
- **Time Range**: Last 3 days (configurable)
- **Interval**: 15 minutes (configurable)
- **Chart Type**: Bar chart (better for discrete time intervals)
- **Features**:
  - Hover tooltips showing exact counts
  - Responsive design
  - Handles empty data gracefully
  - Loading states

## Technical Details

### TimescaleDB Integration
The message timeline uses TimescaleDB's `time_bucket` function for efficient time-series aggregation:
- Automatically groups messages into time buckets
- Optimized for large datasets
- Supports various interval sizes (minutes, hours, days)

### Performance Considerations
- Database overview uses `COUNT()` queries (fast with proper indexes)
- Message timeline uses time-series aggregation (optimized by TimescaleDB)
- Frontend caches data (no automatic refresh)
- Rate limiting applied to prevent abuse

### Error Handling
- Backend: Proper error logging and HTTP status codes
- Frontend: Try-catch blocks with console error logging
- UI: Loading states and "No data available" messages

## Testing

### Backend Testing
```bash
# Test database overview
curl http://localhost:3001/api/v1/statistics/database-overview

# Test message timeline (default: 3 days, 15 minutes)
curl http://localhost:3001/api/v1/statistics/message-timeline

# Test with custom parameters
curl "http://localhost:3001/api/v1/statistics/message-timeline?days=7&intervalMinutes=30"
```

### Frontend Testing
1. Navigate to Network Insights page
2. Click on "Statistics" tab
3. Verify database overview shows table counts
4. Verify message timeline chart displays
5. Check browser console for loading logs:
   - "NetworkInsightsPage: Loading database overview..."
   - "NetworkInsightsPage: Loaded database overview: {...}"
   - "NetworkInsightsPage: Loading message timeline..."
   - "NetworkInsightsPage: Loaded message timeline: {...}"

## Future Enhancements

Potential improvements:
1. **Refresh Button**: Allow users to refresh data without page reload
2. **Time Range Selector**: Let users choose different time ranges (1 day, 7 days, 30 days)
3. **Interval Selector**: Let users choose different intervals (5 min, 15 min, 1 hour)
4. **Export**: Allow exporting timeline data as CSV
5. **Zoom**: Add zoom/pan functionality to timeline chart
6. **Real-time Updates**: WebSocket integration for live updates
7. **Comparison**: Compare current period with previous period
8. **Filters**: Filter by message type, network, or node

## Files Modified

### Backend
- `backend/src/routes/statistics.ts` - Added 2 new endpoints
- `backend/src/services/statistics.service.ts` - Added 2 new methods

### Frontend
- `frontend/src/services/api.ts` - Added 2 new API methods
- `frontend/src/pages/NetworkInsightsPage.tsx` - Added UI components and data loading

## Dependencies

No new dependencies required. Uses existing libraries:
- Backend: Prisma, TimescaleDB
- Frontend: Recharts (already installed), Material-UI

## Deployment Notes

1. No database migrations required (uses existing tables)
2. No environment variables needed
3. Compatible with existing Docker setup
4. No breaking changes to existing functionality
