# Dashboard Analytics Guide

## Overview

The Dashboard Analytics feature provides comprehensive real-time insights into your Meshtastic mesh network through interactive charts, metric cards, and statistical analysis. Access the dashboard from the Network Insights page to monitor network health, activity patterns, and performance metrics.

## Accessing the Dashboard

1. Navigate to **Network Insights** from the main navigation
2. The dashboard loads automatically with the latest data
3. Data refreshes every 60 seconds automatically
4. Click **Refresh** button to update immediately

## Metric Cards

The dashboard displays six key metric cards at the top:

### 1. Total Nodes

**What It Shows:**
- Total number of nodes in the network
- All nodes ever seen, regardless of status

**Color Coding:**
- 🟢 Green: 50+ nodes (healthy network)
- 🟡 Yellow: 10-49 nodes (growing network)
- 🔴 Red: <10 nodes (small network)

**Use Cases:**
- Track network growth over time
- Compare with other networks
- Plan capacity and resources

### 2. Active Nodes

**What It Shows:**
- Nodes seen in last 24 hours
- Percentage of total nodes active
- Network coverage indicator

**Color Coding:**
- 🟢 Green: >75% active (excellent)
- 🟡 Yellow: 50-75% active (good)
- 🔴 Red: <50% active (needs attention)

**Network Coverage:**
- Shows what percentage of nodes are currently reachable
- Helps identify coverage issues
- Indicates network health

**Use Cases:**
- Monitor daily network activity
- Identify inactive nodes
- Assess network reliability

### 3. Gateway Diversity

**What It Shows:**
- Number of unique gateways receiving packets
- Indicates network redundancy
- Shows MQTT connectivity

**Color Coding:**
- 🟢 Green: 5+ gateways (excellent redundancy)
- 🟡 Yellow: 2-4 gateways (good redundancy)
- 🔴 Red: 1 gateway (single point of failure)

**Why It Matters:**
- More gateways = better reliability
- Redundancy prevents data loss
- Distributed monitoring

**Use Cases:**
- Plan gateway placement
- Ensure redundancy
- Identify coverage gaps

### 4. Protocol Diversity

**What It Shows:**
- Number of different message types seen
- Indicates network feature usage
- Shows protocol adoption

**Color Coding:**
- 🟢 Green: 8+ protocols (full feature usage)
- 🟡 Yellow: 4-7 protocols (moderate usage)
- 🔴 Red: <4 protocols (limited usage)

**Common Protocols:**
- POSITION_APP (location updates)
- TELEMETRY_APP (sensor data)
- NODEINFO_APP (node information)
- TEXT_MESSAGE_APP (messages)
- NEIGHBORINFO_APP (topology)
- TRACEROUTE_APP (routing)
- And more...

**Use Cases:**
- Verify feature adoption
- Identify unused capabilities
- Plan network features

### 5. Total Messages

**What It Shows:**
- Total messages processed (last 24 hours)
- All message types combined
- Network activity level

**Color Coding:**
- 🟢 Green: 1000+ messages (very active)
- 🟡 Yellow: 100-999 messages (active)
- 🔴 Red: <100 messages (quiet)

**Use Cases:**
- Monitor network activity
- Identify busy periods
- Detect anomalies

### 6. Success Rate

**What It Shows:**
- Percentage of messages successfully delivered
- Based on acknowledgments and routing
- Network reliability indicator

**Color Coding:**
- 🟢 Green: >90% success (excellent)
- 🟡 Yellow: 70-90% success (good)
- 🔴 Red: <70% success (needs improvement)

**Factors Affecting Success Rate:**
- Signal quality
- Network topology
- Node placement
- Interference
- Channel utilization

**Use Cases:**
- Monitor network health
- Identify reliability issues
- Validate improvements

## Dashboard Charts

### 1. Network Activity Trends (7 Days)

**Chart Type:** Line chart

**What It Shows:**
- Daily message counts for last 7 days
- Trend line showing growth/decline
- Activity patterns over time

**Data Points:**
- Messages per day
- Nodes active per day
- Average messages per node

**Insights:**
- **Growing Trend**: Network expanding
- **Declining Trend**: Nodes going offline
- **Stable Pattern**: Healthy network
- **Spikes**: Special events or issues

**Use Cases:**
- Track network growth
- Identify patterns
- Plan capacity
- Detect anomalies

### 2. Node Activity Distribution

**Chart Type:** Doughnut chart

**What It Shows:**
- Breakdown of nodes by activity level
- Active vs inactive nodes
- Activity categories

**Categories:**
- **Very Active**: >100 messages/day
- **Active**: 10-100 messages/day
- **Moderate**: 1-10 messages/day
- **Inactive**: 0 messages/day

**Insights:**
- Most nodes should be "Active" or "Moderate"
- Too many "Very Active" may indicate chatty nodes
- Many "Inactive" suggests coverage issues

**Use Cases:**
- Identify chatty nodes
- Find inactive nodes
- Balance network load

### 3. Gateway Activity Distribution

**Chart Type:** Horizontal bar chart

**What It Shows:**
- Messages received per gateway
- Gateway load distribution
- Busiest gateways

**Data Points:**
- Gateway name/ID
- Message count
- Percentage of total

**Insights:**
- **Balanced**: Load spread evenly
- **Unbalanced**: One gateway handling most traffic
- **Gaps**: Some gateways not receiving

**Use Cases:**
- Balance gateway load
- Identify gateway issues
- Plan gateway placement

### 4. Signal Quality Distribution

**Chart Type:** Horizontal bar chart

**What It Shows:**
- Distribution of RSSI values
- Signal strength across network
- Quality categories

**RSSI Ranges:**
- **Excellent** (>-60 dBm): Strong signal
- **Good** (-60 to -75 dBm): Reliable
- **Fair** (-75 to -90 dBm): Usable
- **Poor** (<-90 dBm): Weak signal

**Insights:**
- Most links should be "Good" or better
- Many "Poor" links indicate placement issues
- "Excellent" links may be too close

**Use Cases:**
- Assess network quality
- Identify weak links
- Optimize node placement

### 5. Message Routing Patterns

**Chart Type:** Doughnut chart

**What It Shows:**
- Distribution by hop count
- Direct vs multi-hop messages
- Routing efficiency

**Categories:**
- **Direct (0 hops)**: Node to gateway
- **1 Hop**: Through one intermediate
- **2 Hops**: Through two intermediates
- **3+ Hops**: Long routing paths

**Insights:**
- More direct messages = better coverage
- Many multi-hop = sparse network
- Very long paths = inefficient routing

**Use Cases:**
- Assess network density
- Identify routing inefficiencies
- Plan node additions

### 6. Protocol Usage (24 Hours)

**Chart Type:** Pie chart

**What It Shows:**
- Message types in last 24 hours
- Protocol adoption
- Feature usage

**Common Protocols:**
- POSITION_APP: Location updates
- TELEMETRY_APP: Sensor data
- NODEINFO_APP: Node info
- TEXT_MESSAGE_APP: Messages
- NEIGHBORINFO_APP: Topology
- TRACEROUTE_APP: Routing
- Others

**Insights:**
- Balanced usage = full feature adoption
- Dominated by one type = limited usage
- Missing protocols = features not enabled

**Use Cases:**
- Verify feature usage
- Identify configuration issues
- Plan feature rollout

### 7. Most Active Nodes

**Chart Type:** Table

**What It Shows:**
- Top 10 most active nodes
- Message counts
- Activity metrics

**Columns:**
- Node name
- Message count (24h)
- Average messages per hour
- Last seen
- Status

**Insights:**
- Identify chatty nodes
- Find most reliable nodes
- Detect unusual activity

**Use Cases:**
- Monitor network load
- Identify issues
- Recognize key nodes

## Data Refresh and Caching

### Automatic Refresh

**Refresh Interval:**
- Dashboard data: 60 seconds
- Metric cards: 60 seconds
- Charts: 60 seconds
- Real-time updates via WebSocket

**Manual Refresh:**
- Click **Refresh** button anytime
- Forces immediate data reload
- Updates all components

### Caching Strategy

**Server-Side Cache:**
- Dashboard data cached for 60 seconds
- Reduces database load
- Improves response time
- Automatic cache invalidation

**Client-Side Cache:**
- Chart data cached in browser
- Reduces network requests
- Faster page loads
- Cleared on manual refresh

## Filtering and Time Ranges

### Network Filter

If managing multiple networks:

1. Select network from dropdown
2. Dashboard updates for selected network
3. All metrics and charts filtered
4. Bookmark URL to save selection

### Time Range Selection

**Available Ranges:**
- Last Hour
- Last 6 Hours
- Last 24 Hours (default)
- Last 7 Days
- Last 30 Days
- Custom Range

**Affects:**
- All charts and metrics
- Activity calculations
- Trend analysis
- Comparisons

## Exporting Dashboard Data

### Export Options

**Export Formats:**
- **PNG**: Chart images
- **CSV**: Raw data
- **PDF**: Full dashboard report
- **JSON**: API data

**Export Methods:**
1. Click **Export** button
2. Select format
3. Choose what to include
4. Download file

### Scheduled Reports

**Automated Reports:**
1. Settings → Reports
2. Create schedule
3. Select frequency (daily/weekly/monthly)
4. Choose recipients
5. Configure format

**Report Contents:**
- All metric cards
- All charts
- Summary statistics
- Trend analysis
- Recommendations

## Interpreting Dashboard Data

### Healthy Network Indicators

**Good Signs:**
- 75%+ nodes active
- 3+ gateways receiving
- 90%+ success rate
- Balanced gateway load
- Most links "Good" or better
- Growing or stable trends

**Warning Signs:**
- <50% nodes active
- Single gateway
- <70% success rate
- Unbalanced load
- Many "Poor" links
- Declining trends

### Common Patterns

**Daily Cycles:**
- Higher activity during day
- Lower activity at night
- Normal for human-operated networks

**Weekly Patterns:**
- Higher weekday activity
- Lower weekend activity
- Depends on network purpose

**Growth Patterns:**
- Steady increase: Healthy growth
- Rapid spikes: Events or issues
- Sudden drops: Outages or problems

### Anomaly Detection

**Unusual Patterns:**
- Sudden activity spikes
- Unexpected drops
- Changed routing patterns
- New protocol usage
- Gateway failures

**Investigation Steps:**
1. Check MQTT Monitor for details
2. Review node status
3. Check RF links
4. Examine message logs
5. Verify configuration

## Performance Optimization

### For Large Networks

**Optimizations:**
- Increase cache timeout
- Reduce chart data points
- Limit time ranges
- Use aggregated data
- Enable data sampling

**Configuration:**
```yaml
dashboard:
  cacheTimeout: 300  # 5 minutes
  maxDataPoints: 100
  enableSampling: true
  sampleRate: 0.1  # 10% of data
```

### For Slow Connections

**Optimizations:**
- Disable auto-refresh
- Use shorter time ranges
- Reduce chart complexity
- Enable data compression
- Cache aggressively

## Troubleshooting

### Dashboard Not Loading

**Check:**
1. Backend service running
2. Database accessible
3. Network connection active
4. Browser console for errors

**Solution:**
```bash
# Check backend status
docker-compose ps backend

# View backend logs
docker-compose logs backend | tail -50

# Restart if needed
docker-compose restart backend
```

### Data Not Updating

**Check:**
1. Auto-refresh enabled
2. MQTT connection active
3. Messages being received
4. Cache not stale

**Solution:**
1. Click manual refresh
2. Check MQTT Monitor
3. Verify data in database
4. Clear browser cache

### Charts Not Rendering

**Check:**
1. JavaScript enabled
2. Chart.js loaded
3. Browser compatibility
4. Console errors

**Solution:**
1. Refresh page
2. Clear browser cache
3. Try different browser
4. Check for ad blockers

### Incorrect Data

**Check:**
1. Time range selection
2. Network filter
3. Data retention settings
4. Database integrity

**Solution:**
1. Verify filters
2. Check database queries
3. Review retention policies
4. Validate data sources

## Best Practices

### Daily Monitoring

1. **Quick Glance**: Check metric cards
2. **Trend Review**: Look at activity chart
3. **Quality Check**: Review signal distribution
4. **Issue Identification**: Note any red metrics

### Weekly Analysis

1. **Export Data**: Save weekly snapshot
2. **Compare Trends**: Week-over-week comparison
3. **Identify Patterns**: Look for recurring issues
4. **Plan Actions**: Address identified problems

### Monthly Review

1. **Generate Report**: Full monthly report
2. **Analyze Growth**: Track network expansion
3. **Review Goals**: Compare to objectives
4. **Plan Improvements**: Strategic planning

## Related Features

- [RF Link Visualization](rf-link-visualization.md) - Network topology
- [Network Insights](../user-guide.md#network-insights) - Additional analytics
- [MQTT Monitor](../user-guide.md#mqtt-monitor) - Real-time monitoring
- [Data Export](../user-guide.md#data-export) - Export capabilities

## Further Reading

- [Dashboard Implementation](../DASHBOARD_AND_FEATURES_ANALYSIS.md) - Technical details
- [Analytics API](../api-guide.md#analytics) - API documentation
- [Performance Tuning](performance.md) - Optimization guide
- [Troubleshooting](../troubleshooting.md) - Common issues

---

**Need Help?** Check the [Troubleshooting Guide](../troubleshooting.md) or ask in [GitHub Discussions](https://github.com/your-org/meshtastic-node-mapper/discussions).
