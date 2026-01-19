# Encryption Solution Guide

## The Problem

You're seeing encrypted packets in your MQTT Monitor, but they're not appearing in the Nodes list with the information you sent. This is because:

1. ✅ **The encryption infrastructure is working correctly**
2. ✅ **Encrypted packets are being detected and decrypted**
3. ❌ **The encryption keys in your config don't match your devices**

When the wrong key is used, the decryption "succeeds" (produces bytes) but the result is garbage data that can't be parsed as valid protobuf.

## The Solution

You need to get the **actual encryption keys** from your Meshtastic devices and add them to `config/app.yml`.

## Step-by-Step Guide

### Step 1: Get Your Encryption Keys

Choose the method that works best for you:

#### Option A: Using Meshtastic CLI (Easiest)

```bash
# Install Meshtastic CLI
pip install meshtastic

# Connect to your device (via USB)
meshtastic --info

# Export channel configuration
meshtastic --export-config > my-channels.yaml

# View the file to find your keys
cat my-channels.yaml
```

Look for sections like:
```yaml
channels:
  - name: LongFast
    psk: base64:AQ==
  - name: Agatha
    psk: base64:YOUR_KEY_HERE
```

Copy the keys (without the `base64:` prefix).

#### Option B: Using Meshtastic Mobile App

1. Open Meshtastic app
2. Connect to your device
3. Go to: **Settings → Channels**
4. Tap each channel to view its settings
5. Enable "Show Advanced Settings" if needed
6. Copy the "Encryption Key" or "PSK" value

#### Option C: Using Meshtastic Web Client

1. Go to: https://client.meshtastic.org/
2. Connect your device via USB
3. Navigate to: **Config → Channels**
4. View and copy the encryption key for each channel

### Step 2: Test Your Keys (Optional)

Use the provided helper script to verify your keys:

```bash
./scripts/test-encryption-key.sh "AQ=="
./scripts/test-encryption-key.sh "YOUR_OTHER_KEY_HERE"
```

This will show you:
- If the key is valid base64
- The key length in bytes
- A hex dump of the key
- Whether it will be padded or truncated

### Step 3: Update Your Configuration

Edit `config/app.yml` and add your keys:

```yaml
encryption:
  channels:
    - name: "LongFast"
      key: "YOUR_ACTUAL_LONGFAST_KEY"  # Replace with your key
      default: true
    - name: "Agatha"
      key: "YOUR_ACTUAL_AGATHA_KEY"    # Replace with your key
    - name: "MediumSlow"
      key: "YOUR_MEDIUMSLOW_KEY"       # Add more channels as needed
```

**Important Notes**:
- The channel order matters - index 0 is the first channel, index 1 is the second, etc.
- The `default: true` flag indicates which key to use when no channel is specified
- Keys can be any length (1-32 bytes) - they'll be automatically padded to 32 bytes
- All keys must be base64-encoded

### Step 4: Restart the Backend

```bash
docker-compose restart backend
```

### Step 5: Verify It's Working

#### Check the logs:
```bash
docker logs meshtastic-backend --tail 100 | grep -A 5 -i decrypt
```

**Before (wrong keys)**:
```
Successfully decrypted payload (41 -> 41 bytes)
Failed to decode decrypted payload: invalid wire type 7 at offset 11
```

**After (correct keys)**:
```
Successfully decrypted payload (41 -> 41 bytes)
Parsed protobuf Meshtastic data: { nodeId: '!xxxxxxxx', nodeUpdate: {...}, position: {...} }
```

#### Send a test message:
1. Send a message from your Meshtastic device
2. Check the MQTT Monitor - you should see the message
3. Check the Nodes page - you should see the node with updated information
4. Check the logs - no "Failed to decode" errors

## Understanding Your Network

Based on your MQTT logs, you have messages on these channels:

- **LongFast** - `msh/US/DMV/2/e/LongFast/...`
- **Agatha** - `msh/US/DMV/2/e/Agatha/...`
- **Regional variations** - `msh/US/MD/2/e/LongFast/...`, `msh/US/VA/VPM/2/e/LongFast/...`

Each channel may have a different encryption key. You'll need to get the keys for all channels you want to monitor.

## Common Issues

### Issue: "I don't have access to my devices"

If you're monitoring a public Meshtastic network and don't own the devices:
- You can only decrypt messages if you know the channel keys
- Contact the network administrator for the keys
- Some networks use public channels with known keys (like the default LongFast key)
- Consider monitoring unencrypted channels instead

### Issue: "Some messages decrypt, others don't"

This is normal if:
- Different devices use different channels
- You only have keys for some channels
- Solution: Add keys for all channels to your config

### Issue: "The default LongFast key doesn't work"

The default LongFast key (`AQ==`) only works if:
- The devices are using the default configuration
- The channel hasn't been customized
- Many networks use custom keys for security
- Solution: Get the actual key from your devices

## Technical Details

### How Meshtastic Encryption Works

- **Algorithm**: AES-256-CTR
- **Key Size**: 32 bytes (256 bits)
- **Nonce/IV**: Derived from packet ID (16 bytes)
- **Key Padding**: Keys shorter than 32 bytes are padded with zeros
- **Channel Index**: Each packet includes which channel (key) to use

### Why Decryption "Succeeds" with Wrong Keys

AES-256-CTR decryption always produces output, even with the wrong key:
1. The encrypted bytes are XORed with a keystream
2. With the wrong key, you get a different keystream
3. The result is garbage data, not valid protobuf
4. Protobuf parsing fails with "invalid wire type" errors

This is why you see "Successfully decrypted" but then "Failed to decode".

### Key Format

Keys in `config/app.yml` must be:
- Base64-encoded strings
- Any length from 1 to 32 bytes (after decoding)
- Automatically padded to 32 bytes if shorter
- Automatically truncated to 32 bytes if longer

Example key lengths:
- `AQ==` → 1 byte → padded to 32 bytes
- `1PG7OiApB3XvvX7g8kYzDYQD+CW+3Oi+Qs/LoIWh/gg=` → 32 bytes → used as-is

## Next Steps

1. **Get your encryption keys** using one of the methods above
2. **Update `config/app.yml`** with the correct keys
3. **Restart the backend**: `docker-compose restart backend`
4. **Test** by sending a message from your device
5. **Verify** in the logs and frontend that messages are being decrypted

## Need Help?

If you're still having issues:

1. **Check the logs** for specific error messages:
   ```bash
   docker logs meshtastic-backend --tail 200 | grep -i "encrypt\|decrypt\|error"
   ```

2. **Verify your keys** are valid base64:
   ```bash
   ./scripts/test-encryption-key.sh "YOUR_KEY"
   ```

3. **Check the channel configuration** on your devices matches your config

4. **Review the full documentation** in `ENCRYPTION_DECRYPTION_STATUS.md`

## Summary

The encryption system is **fully functional** - it just needs the right keys. Once you add the correct encryption keys from your Meshtastic devices to `config/app.yml`, encrypted messages will be decrypted and appear in your node list with all the information you sent.
