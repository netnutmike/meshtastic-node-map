# MQTT Bridge Configuration Issue

## Problem
The Mosquitto MQTT broker is unable to establish bridge connections to public Meshtastic MQTT servers.

## Root Cause
Public Meshtastic MQTT servers have authentication and authorization restrictions that prevent MQTT bridge connections:

1. **mqtt.meshtastic.org** - Returns "Connection Refused: bad user name or password"
2. **mqtt.meshtastic.liamcottle.net** - Returns "Connection Refused: not authorised"

## Why This Happens

### Changes to Public MQTT Server (August 2024)
According to [Meshtastic's blog post](https://meshtastic.org/blog/recent-public-mqtt-broker-changes/), the public MQTT server made significant changes:

- Removed ability to subscribe to all topics (`msh/#`)
- Only allows regional topic subscriptions (e.g., `msh/US/#`)
- Implemented stricter access controls for privacy reasons
- Designed for direct device connections, not bridge connections

### Server Design
These public servers are designed for:
- Meshtastic devices connecting directly via WiFi/Ethernet
- Mobile apps using client proxy mode
- NOT for MQTT broker-to-broker bridging

## Current Status
❌ Bridge connections to public servers are **NOT WORKING** due to authentication restrictions

## Alternative Solutions

### Option 1: Connect Your Own Meshtastic Device
The recommended approach is to connect your own Meshtastic device to your local MQTT broker:

1. Get a Meshtastic device with WiFi/Ethernet capability
2. Configure the device's MQTT module to connect to your local broker:
   - Server: `mosquitto` (or your broker's hostname)
   - Port: `1883`
   - Enable uplink/downlink on desired channels
3. The device will publish messages directly to your broker

### Option 2: Use MQTT Client Instead of Bridge
Instead of using Mosquitto bridges, create a custom MQTT client that:
- Subscribes to public servers (if they allow client connections)
- Republishes messages to your local broker
- Can handle authentication and reconnection logic

Example using Node.js:
```javascript
const mqtt = require('mqtt');

// Connect to public server
const publicClient = mqtt.connect('mqtt://mqtt.meshtastic.org:1883');

// Connect to local broker
const localClient = mqtt.connect('mqtt://localhost:1883');

publicClient.on('connect', () => {
  publicClient.subscribe('msh/US/#');
});

publicClient.on('message', (topic, message) => {
  // Republish to local broker
  localClient.publish(topic, message);
});
```

### Option 3: Use Your Own Regional Network
If you're part of a regional Meshtastic network, ask the network administrator if they have a local MQTT broker you can bridge to.

### Option 4: Monitor Local Traffic Only
Focus on monitoring traffic from your own Meshtastic devices and local mesh network, rather than trying to pull in global traffic.

## Recommended Configuration

For now, I recommend **disabling the bridge connections** and using one of the alternative solutions above:

```conf
# Bridge configuration (DISABLED - public servers don't allow bridges)
# To receive Meshtastic data, connect a Meshtastic device directly to this broker
# or use a custom MQTT client to relay messages

# connection bridge_meshtastic
# address mqtt.meshtastic.org:1883
# topic msh/US/# in 0
```

## Testing Public Server Access

To test if you can connect as a regular client (not bridge):
```bash
docker exec meshtastic-mosquitto mosquitto_sub -h mqtt.meshtastic.org -p 1883 -t 'msh/US/FL/#' -C 5 -v
```

If this also fails, the public server may have additional restrictions or require device-specific authentication.

## Next Steps

1. **Disable bridge connections** in mosquitto.conf (they're not working)
2. **Connect a Meshtastic device** to your local broker if you have one
3. **Monitor local traffic** from your own devices
4. **Consider building a custom MQTT relay** if you need public server data

## Date
February 2, 2026
