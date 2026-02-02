# Analytics Components

This directory contains the analytics and dashboard components for the Meshtastic Node Mapper application.

## Components

### DashboardMetricCards

Displays 6 key metric cards showing network statistics:

- **Total Nodes**: Total number of nodes in the network
- **Active Nodes (24h)**: Number of nodes active in the last 24 hours with coverage percentage
- **Gateway Diversity**: Number of unique gateways
- **Protocol Diversity**: Number of distinct message types
- **Total Messages**: Total message count
- **Processing Success Rate**: Success rate with color-coded thresholds (green ≥95%, yellow 85-94%, red <85%)

**Usage:**
```tsx
import { DashboardMetricCards } from './components/Analytics';

<DashboardMetricCards metrics={dashboardData.metrics} />
```

### DashboardCharts

Displays 7 comprehensive charts for network analysis:

1. **Network Activity Trends** (Line Chart): Messages per hour over 7 days
2. **Node Activity Distribution** (Doughnut Chart): Nodes categorized by activity level
3. **Gateway Activity Distribution** (Bar Chart): Top 10 gateways by packet count
4. **Signal Quality Distribution** (Bar Chart): Messages categorized by RSSI
5. **Message Routing Patterns** (Doughnut Chart): Direct, routed, and multi-hop messages
6. **Protocol Usage** (Pie Chart): Message count per protocol type (24h)
7. **Most Active Nodes Table**: Top 10 nodes with message counts and signal quality

**Usage:**
```tsx
import { DashboardCharts } from './components/Analytics';

<DashboardCharts 
  charts={dashboardData.charts} 
  topNodes={dashboardData.topNodes} 
/>
```

### DashboardExample

Complete example showing how to integrate DashboardMetricCards and DashboardCharts with API data fetching.

**Usage:**
```tsx
import { DashboardExample } from './components/Analytics';

<DashboardExample />
```

### Analytics

Advanced analytics component with ML-powered features:

- Node failure predictions
- Network anomaly detection
- Performance optimization recommendations
- Trend analysis and forecasting
- Intelligent alerts

**Usage:**
```tsx
import { Analytics } from './components/Analytics';

<Analytics networkId="optional-network-id" />
```

## Data Structures

### DashboardMetrics

```typescript
interface DashboardMetrics {
  totalNodes: number;
  activeNodes24h: number;
  activeNodesPercentage: number;
  gatewayDiversity: number;
  protocolDiversity: number;
  totalMessages: number;
  successRate: number;
}
```

### DashboardChartsData

```typescript
interface DashboardChartsData {
  networkActivityTrends: Array<{
    timestamp: string | Date;
    messageCount: number;
  }>;
  nodeActivityDistribution: Array<{
    category: string;
    count: number;
  }>;
  gatewayActivityDistribution: Array<{
    category: string;
    count: number;
  }>;
  signalQualityDistribution: Array<{
    category: string;
    count: number;
  }>;
  messageRoutingPatterns: Array<{
    category: string;
    count: number;
  }>;
  protocolUsage: Array<{
    protocol: string;
    count: number;
  }>;
}
```

### TopNodeData

```typescript
interface TopNodeData {
  nodeId: string;
  shortName: string;
  longName: string;
  messageCount: number;
  avgRssi: string | null;
}
```

## API Integration

The dashboard components expect data from the `/api/analytics/dashboard` endpoint:

```typescript
GET /api/analytics/dashboard

Response:
{
  metrics: DashboardMetrics,
  charts: DashboardChartsData,
  topNodes: TopNodeData[]
}
```

## Theme Support

All chart components automatically respond to theme changes:

- Listen for `themeChanged` custom events
- Re-render charts with theme-appropriate colors
- Use `applyThemeToChartOptions` utility for consistent theming

## Testing

Comprehensive test coverage includes:

- Chart rendering tests
- Data processing and formatting tests
- Empty state handling
- Theme integration tests
- Accessibility tests
- Performance tests with large datasets

Run tests:
```bash
npm test -- DashboardCharts.test.tsx
npm test -- DashboardMetricCards.test.tsx
```

## Requirements Validation

This implementation satisfies the following requirements:

- **37.1**: Total Nodes metric card
- **37.2**: Active Nodes (24h) metric card with coverage percentage
- **37.3**: Gateway Diversity metric card
- **37.4**: Protocol Diversity metric card
- **37.5**: Processing Success Rate with color-coded thresholds
- **37.6**: Network Activity Trends line chart (7 days)
- **37.7**: Node Activity Distribution doughnut chart
- **37.8**: Gateway Activity Distribution bar chart
- **37.9**: Signal Quality Distribution bar chart
- **37.10**: Message Routing Patterns doughnut chart
- **37.11**: Protocol Usage pie chart (24h)
- **37.12**: Most Active Nodes table
- **37.13**: Single optimized SQL query for all statistics
- **37.14**: 60-second caching with Redis
- **37.15**: Theme-aware color updates

## Performance Considerations

- Charts use React keys to force re-render on theme changes
- Large datasets are handled efficiently with Chart.js
- Event listeners are properly cleaned up on unmount
- API responses are cached for 60 seconds
- Single optimized database query reduces load

## Accessibility

- Proper ARIA labels for charts
- Accessible table structure with headers
- Keyboard navigation support
- Screen reader friendly content
- Color-blind friendly color schemes

## Future Enhancements

Potential improvements for future iterations:

- Export charts as images
- Drill-down functionality for detailed views
- Real-time updates via WebSocket
- Customizable time ranges
- Chart comparison tools
- Custom metric definitions
