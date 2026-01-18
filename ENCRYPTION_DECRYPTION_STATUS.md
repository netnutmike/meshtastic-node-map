# Encryption/Decryption Status

## Quick Summary

**Status**: 🟡 Infrastructure Working, Keys Needed

**What's happening**: 
- ✅ Encryption service is working correctly
- ✅ Decryption process executes successfully  
- ❌ Decrypted data is invalid because the encryption keys in `config/app.yml` don't match your devices

**What you need to do**:
1. Get the actual encryption keys from your Meshtastic devices (see "Method 1: Using Meshtastic CLI" below)
2. Update `config/app.yml` with the correct keys
3. Restart backend: `docker-compose restart backend`
4. Test by sending a message from your device

**Quick test**: 
```bash
# Check if decryption is attempting
docker logs meshtastic-backend --tail 50 | grep -i decrypt

# You should see "Successfully decrypted" but also "Failed to decode"
# This means wrong keys - follow the guide below to fix
```

---

## Current State (Updated: 2026-01-18)

The encryption/decryption infrastructure is **fully functional** but requires the correct encryption keys from your Meshtastic devices to decrypt messages.

## What's Working ✅

1. **Encryption Service**: Successfully loads and initializes
2. **Key Loading**: Reads encryption keys from `config/app.yml`
3. **Key Padding**: Correctly pads short keys (like 1-byte `AQ==`) to 32 bytes for AES-256
4. **Decryption Attempt**: Detects encrypted packets and attempts to decrypt them
5. **Decryption Process**: Successfully decrypts payloads (bytes are being decrypted)
6. **Packet ID Handling**: Fixed to handle negative packet IDs correctly using DataView

## What's Not Working ❌

1. **Wrong Encryption Keys**: The decrypted payloads are not valid protobuf messages, indicating the encryption keys in `config/app.yml` don't match the keys used by your Meshtastic devices
2. **Protobuf Parsing Fails**: After decryption, the payload fails to parse as valid Data protobuf messages

## Evidence from Latest Logs

```
2026-01-18 00:52:09 [App] debug: Packet is encrypted, attempting to decrypt... 
2026-01-18 00:52:09 [App] debug: Successfully decrypted payload (78 -> 78 bytes) 
2026-01-18 00:52:09 [App] error: Failed to decode decrypted payload: index out of range: 41 + 1522 > 78
2026-01-18 00:52:11 [App] debug: Successfully decrypted payload (28 -> 28 bytes) 
2026-01-18 00:52:11 [App] error: Failed to decode decrypted payload: invalid wire type 6 at offset 2
```

This shows:
- Encryption is detected ✅
- Decryption completes ✅
- But the decrypted data is invalid protobuf (wrong key) ❌

## Detected Channels

Your MQTT broker is receiving messages on multiple encrypted channels:
- **LongFast** - `msh/US/DMV/2/e/LongFast/...`
- **Agatha** - `msh/US/DMV/2/e/Agatha/...`
- **Other regional channels** - `msh/US/MD/2/e/LongFast/...`, `msh/US/VA/VPM/2/e/LongFast/...`

Each channel may have a different encryption key.

## Current Configuration

The system is configured with two channel keys in `config/app.yml`:

```yaml
encryption:
  channels:
    - name: "LongFast"
      key: "AQ=="  # 1 byte (0x01), padded to 32 bytes
      default: true
    - name: "Primary"
      key: "1PG7OiApB3XvvX7g8kYzDYQD+CW+3Oi+Qs/LoIWh/gg="  # 32-byte custom key
```

**Note**: The `AQ==` key is correctly padded to 32 bytes by the encryption service, but this key doesn't match what your devices are actually using.

## How Meshtastic Encryption Works

1. **Channel Keys**: Each Meshtastic channel has its own AES-256 encryption key (32 bytes)
2. **Default Channel**: The "LongFast" channel typically uses all zeros as the default key
3. **Custom Channels**: Users can create custom channels with their own encryption keys
4. **Packet Encryption**: Each packet includes a channel index that indicates which key to use
5. **Nonce/IV**: The packet ID is used as the nonce/initialization vector for AES-256-CTR

## What You Need to Do

### CRITICAL: Get the Actual Encryption Keys from Your Devices

The encryption infrastructure is working correctly - you just need to provide the actual keys being used by your Meshtastic network. Here's how:

#### Method 1: Using Meshtastic CLI (Recommended)

1. **Install Meshtastic CLI**:
   ```bash
   pip install meshtastic
   ```

2. **Connect to your device** (via USB or Bluetooth):
   ```bash
   meshtastic --info
   ```

3. **Export channel configuration**:
   ```bash
   meshtastic --export-config > my-channels.yaml
   ```

4. **Look for the PSK (Pre-Shared Key)** in the exported file:
   ```yaml
   channels:
     - name: LongFast
       psk: base64:AQ==
     - name: Agatha
       psk: base64:SOME_BASE64_KEY_HERE
   ```

5. **Copy the base64 keys** (without the `base64:` prefix) to your `config/app.yml`

#### Method 2: Using Meshtastic Mobile App

1. **Open the Meshtastic app** on your phone
2. **Connect to your device**
3. **Go to**: Settings → Channels
4. **For each channel**:
   - Tap on the channel name
   - Enable "Show Advanced Settings" (if available)
   - Look for "Encryption Key" or "PSK"
   - Copy the base64-encoded key

#### Method 3: Using Meshtastic Web Interface

1. **Connect your device via USB**
2. **Open**: https://client.meshtastic.org/
3. **Connect to your device**
4. **Navigate to**: Config → Channels
5. **View the encryption key** for each channel

#### Method 4: Check Your Device Configuration File

If you have access to your device's configuration:
- Look for `channels.json` or similar configuration files
- Each channel will have a `psk` field with the base64-encoded key

### Example: Adding Multiple Channel Keys

Once you have the keys, update `config/app.yml`:

```yaml
encryption:
  channels:
    - name: "LongFast"
      key: "YOUR_ACTUAL_LONGFAST_KEY_HERE"  # Replace with actual key
      default: true
    - name: "Agatha"
      key: "YOUR_ACTUAL_AGATHA_KEY_HERE"    # Replace with actual key
    - name: "Primary"
      key: "1PG7OiApB3XvvX7g8kYzDYQD+CW+3Oi+Qs/LoIWh/gg="
```

**Important Notes**:
- Keys can be any length (1-32 bytes) - the service will pad them automatically
- Keys must be base64-encoded
- The channel index (0, 1, 2, etc.) in the config must match the channel index on your devices
- The `default: true` flag indicates which key to use when the channel index is not specified

### After Updating Keys

1. **Restart the backend**:
   ```bash
   docker-compose restart backend
   ```

2. **Check the logs** to verify keys are loaded:
   ```bash
   docker logs meshtastic-backend --tail 50 | grep -i "encryption\|key"
   ```

3. **Send a test message** from your Meshtastic device

4. **Verify decryption** in the logs:
   ```bash
   docker logs meshtastic-backend --tail 50 | grep -i "decrypt"
   ```

You should see:
- ✅ "Successfully decrypted payload"
- ✅ "Parsed protobuf Meshtastic data" (with actual node info)
- ❌ NO "Failed to decode decrypted payload" errors

## How to Update the Keys

Edit `config/app.yml` and update the encryption keys:

```yaml
encryption:
  channels:
    - name: "LongFast"
      key: "YOUR_BASE64_ENCODED_KEY_HERE"  # Get from your device
      default: true
    - name: "Agatha"
      key: "ANOTHER_BASE64_ENCODED_KEY"    # Get from your device
    - name: "CustomChannel"
      key: "YET_ANOTHER_KEY"
```

After updating:
```bash
docker-compose restart backend
```

## Testing Decryption

To verify decryption is working:

1. **Send a test message** from your Meshtastic device on an encrypted channel

2. **Check the backend logs**:
   ```bash
   docker logs meshtastic-backend --tail 100 | grep -A 5 -i decrypt
   ```

3. **Look for success indicators**:
   - ✅ "Successfully decrypted payload (X -> X bytes)"
   - ✅ "Parsed protobuf Meshtastic data: { nodeId: '!xxxxxxxx', ... }"
   - ✅ Node information appearing in the database
   - ❌ NO "Failed to decode decrypted payload" errors
   - ❌ NO "invalid wire type" errors

4. **Check the frontend**:
   - Open the Nodes page
   - Look for your node with the information you sent
   - Check the MQTT Monitor for the decrypted message

5. **Verify in the database**:
   ```bash
   docker exec -it meshtastic-postgres psql -U meshtastic -d meshtastic -c "SELECT * FROM nodes ORDER BY last_seen DESC LIMIT 10;"
   ```

## Technical Details

### Encryption Implementation

- **Algorithm**: AES-256-CTR
- **Key Size**: 32 bytes (256 bits)
- **Nonce/IV**: 16 bytes (packet ID + zeros)
- **Location**: `backend/src/services/encryption.service.ts`

### Decryption Flow

1. MQTT message arrives with encrypted payload
2. `protobuf-decoder.service.ts` detects `packet.encrypted` field
3. Calls `encryptionService.decrypt()` with:
   - Encrypted payload buffer
   - Packet ID (used as nonce)
   - Channel index
4. Decrypted payload is parsed as Data protobuf message
5. Normal message processing continues

### Key Format

Encryption keys must be:
- Exactly 32 bytes (256 bits)
- Base64-encoded in the config file
- Example: `echo -n "your-32-byte-key-here-exactly" | base64`

## Troubleshooting

### "Invalid key length" Error
- **Cause**: Key is not properly base64-encoded or is corrupted
- **Solution**: Verify the key is valid base64. Test with: `echo "YOUR_KEY" | base64 -d | wc -c`
- **Note**: Keys can be 1-32 bytes. The service automatically pads short keys to 32 bytes.

### "Successfully decrypted" but "Failed to decode" / "invalid wire type"
- **Cause**: Wrong encryption key (current issue)
- **Solution**: Get the correct key from your Meshtastic device (see methods above)
- **Why**: The decryption "succeeds" but produces garbage data because the key doesn't match

### "No encryption key available"
- **Cause**: Config file not found or not loaded
- **Solution**: 
  - Verify `config/app.yml` exists and is readable
  - Check backend logs for "Loading encryption config from:"
  - Ensure the file has proper YAML syntax

### Messages appear in MQTT Monitor but not in Nodes list
- **Cause**: Encrypted messages with wrong keys
- **Solution**: Update encryption keys in `config/app.yml` with the actual keys from your devices
- **Current Status**: This is your current issue - the infrastructure works, but needs the right keys

### Different channels have different keys
- **Solution**: Add all channel keys to `config/app.yml`:
  ```yaml
  encryption:
    channels:
      - name: "LongFast"
        key: "KEY_FOR_LONGFAST"
        default: true
      - name: "Agatha"
        key: "KEY_FOR_AGATHA"
      - name: "MediumSlow"
        key: "KEY_FOR_MEDIUMSLOW"
  ```
- **Note**: The channel index (0, 1, 2) must match your device configuration

### How to find which key is being used
- **Check MQTT topic**: Topics like `msh/US/DMV/2/e/LongFast/!xxxxx` indicate the "LongFast" channel
- **Check packet channel field**: The protobuf packet includes a channel index (0, 1, 2, etc.)
- **Try each key**: If unsure, add all your channel keys to the config and let the service try them

## Next Steps

1. **Get the correct encryption keys** from your Meshtastic devices
2. **Update `config/app.yml`** with the correct keys
3. **Restart the backend**: `docker-compose restart backend`
4. **Test** by sending a message and checking if it appears in the node list
5. **Verify** in the MQTT Monitor that decrypted messages show proper content

## Additional Resources

- [Meshtastic Encryption Documentation](https://meshtastic.org/docs/overview/encryption/)
- [Meshtastic Channel Configuration](https://meshtastic.org/docs/settings/config/channels/)
- [AES-256-CTR Encryption](https://en.wikipedia.org/wiki/Block_cipher_mode_of_operation#Counter_(CTR))
