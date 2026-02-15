# Feature Documentation Index

This directory contains detailed documentation for all Meshtastic Node Mapper features, with a focus on the latest enhancements introduced in version 1.1.0.

## Core Features

### Network Visualization

**[RF Link Visualization](rf-link-visualization.md)** ⭐ NEW
- Real-time RF connection detection and visualization
- Traceroute and packet-based link discovery
- Signal quality color coding
- Hop depth filtering
- Bidirectional link detection
- Time range selection
- Link statistics and analytics

**Map Features**
- Interactive OpenStreetMap-based visualization
- Multiple tile layer support
- Node clustering for performance
- Real-time position updates
- Coverage area visualization
- Custom overlays and layers

### User Interface

**[Theme Customization](theme-customization.md)** ⭐ NEW
- Light, dark, and auto theme modes
- System preference detection
- Smooth theme transitions
- Theme-aware maps and charts
- Mobile browser integration
- Persistent theme preferences

**[Mobile Optimization](mobile-usage.md)** ⭐ NEW
- Responsive layout for all screen sizes
- Touch-optimized controls (44x44px minimum)
- Bottom sheet navigation on mobile
- Adaptive font sizing
- Progressive Web App (PWA) support
- Offline mode capabilities
- Location services integration

### Analytics and Insights

**[Dashboard Analytics](dashboard-analytics.md)** ⭐ NEW
- Six real-time metric cards
- Seven interactive charts
- Network activity trends (7 days)
- Node activity distribution
- Gateway activity analysis
- Signal quality distribution
- Message routing patterns
- Protocol usage breakdown
- Most active nodes table
- Auto-refresh every 60 seconds

**Network Insights**
- Comprehensive network statistics
- Node distribution analysis
- Message analytics
- Network health monitoring
- Coverage analysis
- Utilization tracking

### Advanced Analysis Tools

**Distance Calculation** ⭐ NEW
- Haversine formula implementation
- Distance display on RF links
- Longest links analysis
- Multi-hop distance calculation
- Location history caching
- Age warnings for stale data

**Line of Sight Analysis** ⭐ NEW
- Two-node LOS analysis
- Elevation profile visualization
- Fresnel zone clearance calculation
- Terrain obstruction detection
- Bearing/azimuth calculation
- Historical connectivity data
- Shareable analysis URLs

**Gateway Comparison** ⭐ NEW
- Side-by-side gateway analysis
- Common packet detection
- Signal quality comparison
- RSSI and SNR scatter plots
- Timeline charts
- Difference histograms
- CSV export capability

**Packet Analysis** ⭐ NEW
- Packet grouping by ID
- Advanced filtering options
- Time range filters
- Node and gateway pickers
- Port number filtering
- Hop count filtering
- RSSI/SNR range filters
- TEXT_MESSAGE_APP decoding
- Relay node formatting

### Data Management

**Data Retention** ⭐ NEW
- Configurable retention policies
- Automatic data cleanup
- Batch deletion operations
- VACUUM optimization
- Manual cleanup triggers
- Audit trail logging
- Disk space monitoring

**Data Export**
- Multiple format support (CSV, JSON, KML)
- Filtered exports
- Scheduled reports
- Backup and restore
- Shareable URLs

### Reusable Components

**UI Components** ⭐ NEW
- NodePicker: Searchable node dropdown
- GatewayPicker: Gateway selection
- ModernTable: Paginated, sortable tables
- SignalQualityBadge: Color-coded signal indicators
- TimeRangePicker: Date/time selection
- LoadingSpinner: Loading states
- EmptyState: Empty data displays
- ActionButtonGroup: Icon button groups

**URL State Management** ⭐ NEW
- Filter state in URL
- Bookmarkable views
- Shareable links
- Browser navigation support
- Debounced updates
- Parameter validation

## Feature Categories

### By Priority

**Priority 1.0 - Core Network Visualization**
- RF Link Visualization
- Hop Depth Filtering
- Distance Calculation

**Priority 1.1 - User Experience**
- Theme Support
- Mobile Responsiveness

**Priority 1.2 - Analytics**
- Dashboard Analytics
- Network Insights

**Priority 2.0 - Advanced Analysis**
- Packet Analysis
- Line of Sight
- Gateway Comparison

**Priority 3.0 - Infrastructure**
- Data Retention
- Reusable Components
- URL State Management

### By User Type

**For Network Operators**
- RF Link Visualization
- Dashboard Analytics
- Network Insights
- MQTT Monitor
- Data Retention

**For Field Technicians**
- Mobile Optimization
- Line of Sight Analysis
- Distance Calculation
- Location Services
- Offline Mode

**For Analysts**
- Gateway Comparison
- Packet Analysis
- Data Export
- Advanced Filtering
- Historical Data

**For Administrators**
- Theme Customization
- Configuration Management
- Data Retention
- Backup and Restore
- Performance Tuning

## Getting Started

### New Users

1. Start with the [User Guide](../user-guide.md) for basic features
2. Review [Installation Guide](../installation.md) for setup
3. Explore [RF Link Visualization](rf-link-visualization.md) for network topology
4. Check [Dashboard Analytics](dashboard-analytics.md) for insights

### Existing Users (Upgrading)

1. Review [Deployment Guide](../deployment-new-features.md) for upgrade steps
2. Explore new features:
   - [RF Link Visualization](rf-link-visualization.md)
   - [Theme Customization](theme-customization.md)
   - [Mobile Usage](mobile-usage.md)
   - [Dashboard Analytics](dashboard-analytics.md)
3. Update configuration with new options
4. Test new features in your environment

### Mobile Users

1. Read [Mobile Usage Guide](mobile-usage.md)
2. Install as PWA for app-like experience
3. Enable location services for distance features
4. Configure offline mode for field use
5. Adjust theme for your environment

### Developers

1. Review [API Guide](../api-guide.md) for new endpoints
2. Check [Developer Documentation](../developer/) for architecture
3. Explore reusable components for custom features
4. Review URL state management for integration
5. Read [Implementation Guides](../implementation/) for technical details

## Feature Comparison

### Version 1.0.0 vs 1.1.0

| Feature | v1.0.0 | v1.1.0 |
|---------|--------|--------|
| RF Link Visualization | ❌ | ✅ |
| Theme Support | ❌ | ✅ |
| Mobile Optimization | Partial | ✅ Full |
| Dashboard Analytics | Basic | ✅ Advanced |
| Packet Grouping | ❌ | ✅ |
| Distance Calculation | ❌ | ✅ |
| Line of Sight | ❌ | ✅ |
| Gateway Comparison | ❌ | ✅ |
| Data Retention | ❌ | ✅ |
| URL State Management | ❌ | ✅ |
| Reusable Components | Limited | ✅ Extensive |

## Common Use Cases

### Network Monitoring
- [Dashboard Analytics](dashboard-analytics.md) - Real-time metrics
- [RF Link Visualization](rf-link-visualization.md) - Topology view
- MQTT Monitor - Message stream
- Network Insights - Statistics

### Troubleshooting
- [RF Link Visualization](rf-link-visualization.md) - Connection issues
- [Line of Sight Analysis](line-of-sight.md) - Coverage problems
- [Gateway Comparison](gateway-comparison.md) - Signal quality
- Packet Analysis - Message delivery

### Network Planning
- [Line of Sight Analysis](line-of-sight.md) - Node placement
- Distance Calculation - Coverage estimation
- Coverage Analysis - Gap identification
- [Dashboard Analytics](dashboard-analytics.md) - Capacity planning

### Field Operations
- [Mobile Usage](mobile-usage.md) - Mobile interface
- Location Services - GPS integration
- Offline Mode - No connectivity
- Distance Calculation - Range testing

### Data Analysis
- [Dashboard Analytics](dashboard-analytics.md) - Trends and patterns
- Data Export - External analysis
- [Gateway Comparison](gateway-comparison.md) - Performance comparison
- Packet Analysis - Message patterns

## Configuration

All features can be configured in `config/app.yml`. See [Deployment Guide](../deployment-new-features.md) for configuration examples.

### Quick Configuration

```yaml
# Enable all new features
rfLinks:
  enabled: true
theme:
  enabled: true
mobile:
  enabled: true
dashboard:
  enabled: true
packets:
  groupingEnabled: true
distance:
  enabled: true
lineOfSight:
  enabled: true
gatewayComparison:
  enabled: true
```

## Performance Considerations

### For Large Networks (1000+ nodes)

- Increase cache timeouts
- Reduce time ranges
- Enable data sampling
- Use hop depth filtering
- Limit visible nodes

See [Performance Optimization](../user-guide.md#performance-optimization) for details.

### For Mobile Devices

- Enable battery saver mode
- Use dark theme (OLED screens)
- Reduce update frequency
- Enable offline mode
- Lower map quality

See [Mobile Usage Guide](mobile-usage.md#battery-optimization) for details.

## Troubleshooting

Common issues and solutions:

- **RF Links Not Appearing**: Check [RF Link Troubleshooting](rf-link-visualization.md#troubleshooting)
- **Theme Not Changing**: See [Theme Troubleshooting](theme-customization.md#troubleshooting)
- **Mobile Layout Issues**: Review [Mobile Troubleshooting](mobile-usage.md#troubleshooting-mobile-issues)
- **Dashboard Not Loading**: Check [Dashboard Troubleshooting](dashboard-analytics.md#troubleshooting)

For general issues, see the main [Troubleshooting Guide](../troubleshooting.md).

## API Documentation

All features are accessible via REST API. See [API Guide](../api-guide.md) for:

- RF Links: `GET /api/map/links`
- Dashboard: `GET /api/analytics/dashboard`
- Distance: `GET /api/links/longest`
- Line of Sight: `GET /api/analysis/line-of-sight`
- Gateway Comparison: `GET /api/gateways/compare`
- Packets: `GET /api/packets/grouped`

## Further Reading

- [User Guide](../user-guide.md) - Complete feature walkthrough
- [Installation Guide](../installation.md) - Setup instructions
- [API Guide](../api-guide.md) - API documentation
- [Developer Guide](../developer/) - Development documentation
- [Troubleshooting](../troubleshooting.md) - Common issues

## Support

- **Documentation**: Start here for feature guides
- **GitHub Issues**: Report bugs and request features
- **GitHub Discussions**: Ask questions and share tips
- **Meshtastic Forums**: Connect with the community

---

**Version**: 1.1.0  
**Last Updated**: December 2024  
**Status**: All features documented and tested
