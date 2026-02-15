# Network Topology Graph - Quick Summary

## What Changed

### ✅ Fixed
1. **Lines now appear between nodes** based on:
   - Neighbor relationships (solid, colored by signal strength)
   - Traceroute paths (purple dashed)
   - Gateway connections (blue dotted) - **NEW!**

2. **Removed unnecessary toggles**:
   - ❌ "Neighbors" toggle removed
   - ❌ "Traceroutes" toggle removed
   - ✅ All link types always shown

### 🆕 Gateway Links (New Feature)

Gateway links show which nodes are heard by which gateways:

```
Gateway !abc123 → Node !def456
```

This is detected automatically from MQTT topics:
```
Topic: msh/2/json/LongFast/!abc123
                            └─ Gateway ID
```

## Visual Guide

### Link Types

| Type | Appearance | Color | Meaning |
|------|-----------|-------|---------|
| **Neighbor** | Solid line | Green to Red | Direct neighbor with signal strength |
| **Traceroute** | Dashed line | Purple | Hop in routing path |
| **Gateway** | Dotted line | Blue | Node heard by gateway |

### Signal Strength Colors (Neighbor Links)

- 🟢 Green: Strong (-50 dBm or better)
- 🟢 Light Green: Good (-70 to -50 dBm)
- 🟡 Yellow: Fair (-85 to -70 dBm)
- 🟠 Orange: Poor (-100 to -85 dBm)
- 🔴 Red: Very poor (below -100 dBm)

## Files Changed

### Frontend
- `frontend/src/components/Map/NetworkTopologyGraph.tsx`
  - Added gateway link type
  - Removed toggle switches
  - Updated rendering logic

### Backend
- `backend/src/routes/links.ts`
  - Added gateway link detection from MQTT topics
  - Queries messages table for recent messages
  - Extracts gateway ID from topic
  - Creates gateway-to-node links

### Tests
- `backend/src/__tests__/topology-links.test.ts` (new)
  - Tests for all three link types
  - Tests for filtering and deduplication

### Documentation
- `docs/features/network-topology-graph.md` (new)
- `docs/fixes/TOPOLOGY_GRAPH_IMPROVEMENTS.md` (new)

## How to Use

1. Open the map page
2. Click the topology graph button
3. See all three types of connections:
   - Solid lines = neighbors
   - Dashed purple = traceroutes
   - Dotted blue = gateways

## Example Output

The API now returns links like this:

```json
{
  "links": [
    {
      "source": "!node1",
      "target": "!node2",
      "type": "neighbor",
      "rssi": -65,
      "snr": 8.5
    },
    {
      "source": "!node1",
      "target": "!node3",
      "type": "traceroute",
      "hopIndex": 0
    },
    {
      "source": "!gateway1",
      "target": "!node1",
      "type": "gateway"
    }
  ]
}
```

## No Database Changes Required

✅ All changes are code-only
✅ Backward compatible
✅ No migrations needed

## Deploy

```bash
# Rebuild and restart
docker-compose up -d --build
```

That's it! The topology graph now shows all network connections including gateway links.
