# Network Topology - NEIGHBORINFO Troubleshooting

## Problem

The Network Topology Graph shows nodes but no connections between them.

## Root Cause

The topology graph requires **NEIGHBORINFO_APP** messages from your Meshtastic devices. These messages contain information about which nodes can "hear" each other and their signal strength.

**Current Status:**
- ✅ NEIGHBORINFO messages ARE being sent by your routers
- ❌ NEIGHBORINFO messages are ENCRYPTED and cannot be decrypted
- ❌ No channel encryption keys (PSKs) are configured in the database
- ❌ Result: 0 neighbor relationships in database

## Solution

You need to add the encryption keys (PSKs) for your Meshtastic channels so the system can decrypt NEIGHBORINFO messages.

### Step 1: Get Your Channel PSKs

From your Meshtastic device or app, get the Base64-encoded PSK for each channel:

**Using Meshtastic CLI:**
```bash
meshtastic --info
```

**Using Meshtastic App:**
1. Open channel settings
2. View the QR code or channel URL
3. The PSK is in the URL: `https://meshtastic.org/e/#...?psk=base64_encoded_key`

**Common Default PSKs:**
- LongFast (default): `AQ==` (this is the public default key)
- Custom channels: Will have unique PSKs

### Step 2: Add Channels to Database

You need to add channel records with PSKs to your database.

**Option A: Using the API (Recommended)**

```bash
# Add LongFast channel with default PSK
curl -X POST http://localhost:3001/api/v1/channels \
  -H "Content-Type: application/json" \
  -d '{
    "networkId": "default-network",
    "index": 0,
    "name": "LongFast",
    "psk": "AQ==",
    "isDefault": true
  }'

# Add your custom channel
curl -X POST http://localhost:3001/api/v1/channels \
  -H "Content-Type: application/json" \
  -d '{
    "networkId": "default-network",
    "index": 1,
    "name": "YourChannelName",
    "psk": "YOUR_BASE64_PSK_HERE",
    "isDefault": false
  }'
```

**Option B: Direct Database Insert**

```bash
docker exec meshtastic-postgres psql -U meshtastic -d meshtastic_mapper -c "
INSERT INTO channels (id, \"networkId\", index, name, psk, \"isDefault\", \"createdAt\", \"updatedAt\")
VALUES 
  ('channel-longfast', 'default-network', 0, 'LongFast', 'AQ==', true, NOW(), NOW()),
  ('channel-custom', 'default-network', 1, 'YourChannelName', 'YOUR_PSK_HERE', false, NOW(), NOW())
ON CONFLICT DO NOTHING;
"
```

### Step 3: Restart Backend

After adding channels, restart the backend to reload the encryption keys:

```bash
docker-compose restart backend
```

### Step 4: Verify

Wait a few minutes for new NEIGHBORINFO messages to arrive, then check:

```bash
# Check if neighbor data is being stored
docker exec meshtastic-postgres psql -U meshtastic -d meshtastic_mapper -c "
SELECT COUNT(*) as neighbor_count FROM node_neighbors;
"

# Check backend logs for NEIGHBORINFO processing
docker logs meshtastic-backend --tail 100 | grep -i "NEIGHBORINFO\|neighbor"
```

## How to Find Your Channel Names

Check your recent MQTT messages to see which channels are being used:

```bash
docker logs meshtastic-backend --tail 500 | grep "channel" | grep -i "decrypt"
```

Look for lines like:
- `Successfully decrypted and decoded packet from channel "LongFast"`
- `Failed to decrypt/decode protobuf message on channel YourChannelName`

The failed ones are channels that need PSKs added.

## Expected Results

Once encryption keys are configured:

1. **Backend logs** will show:
   ```
   Received NEIGHBORINFO_APP message
   Processing 5 neighbors for node: !a1b2c3d4
   Stored neighbor relationship: !a1b2c3d4 -> !e5f6g7h8
   ```

2. **Database** will have neighbor records:
   ```sql
   SELECT n1.shortName as node, n2.shortName as neighbor, nn.snr 
   FROM node_neighbors nn
   JOIN nodes n1 ON nn."nodeId" = n1.id
   JOIN nodes n2 ON nn."neighborId" = n2.id
   LIMIT 10;
   ```

3. **Network Topology Graph** will show connections between nodes with colored lines indicating signal strength

## Troubleshooting

### Still No Neighbors After Adding PSKs?

1. **Check if NEIGHBORINFO is enabled on your devices:**
   ```bash
   meshtastic --get neighbor_info
   ```
   Should show `update_interval` > 0 (typically 900 seconds = 15 minutes)

2. **Enable NEIGHBORINFO if disabled:**
   ```bash
   meshtastic --set neighbor_info.enabled true
   meshtastic --set neighbor_info.update_interval 900
   ```

3. **Wait for the next broadcast:**
   NEIGHBORINFO is sent every 15 minutes to 3 hours depending on configuration

4. **Check backend logs for errors:**
   ```bash
   docker logs meshtastic-backend -f | grep -i "neighbor\|error"
   ```

### Wrong PSK?

If you see "Failed to decrypt" messages after adding PSKs, the PSK might be incorrect:

1. Double-check the Base64-encoded PSK from your device
2. Make sure there are no extra spaces or characters
3. PSKs are case-sensitive

### Multiple Networks?

If you're monitoring multiple Meshtastic networks, you need to:

1. Create separate network records in the database
2. Add channels for each network with their respective PSKs
3. Ensure nodes are associated with the correct network

## Quick Test

To quickly test if a PSK works, you can check if position messages are being decrypted:

```bash
# Before adding PSK - you'll see many "Failed to decrypt" messages
docker logs meshtastic-backend --tail 100 | grep -c "Failed to decrypt"

# After adding PSK - this count should decrease significantly
docker logs meshtastic-backend --tail 100 | grep -c "Successfully decrypted"
```

## Reference

- **NEIGHBORINFO_APP**: Meshtastic portnum 42
- **Default update interval**: 900 seconds (15 minutes)
- **Signal strength colors in topology graph:**
  - Green: Strong signal (-50+ dBm)
  - Yellow: Fair signal (-85+ dBm)  
  - Red: Poor signal (-100+ dBm)
