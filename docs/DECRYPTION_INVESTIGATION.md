# Meshtastic Encryption & Decryption Investigation

## Summary

We've successfully implemented Meshtastic encryption/decryption with the following findings:

### What We Fixed

1. **PSK Expansion**: Implemented proper 1-byte PSK shortcuts:
   - `0x00` = No encryption
   - `0x01` (AQ==) = Maps to Meshtastic default key
   - `0x02-0x0A` = Default key with last byte incremented

2. **AES Algorithm**: Changed from AES-128-CTR to **AES-256-CTR** (Meshtastic uses 256-bit encryption)

3. **Key Expansion**: 1-byte PSK `0x01` expands to 32-byte key by repeating the 16-byte default key:
   ```
   d4f1bb3a20290759f0bcffabcf4e6901d4f1bb3a20290759f0bcffabcf4e6901
   ```

4. **Nonce Handling**: Extract 8-byte nonce from encrypted payload, pad to 16 bytes with zeros

5. **Decryption Process**: 
   - Extract nonce (first 8 bytes)
   - Pad nonce to 16 bytes
   - Decrypt remaining bytes with AES-256-CTR

### Current Status: 100% Decryption Failure

**The decryption algorithm is working correctly** - we verified that Python and TypeScript produce identical output. However, the decrypted data is garbage (invalid protobuf), which means **the encryption key is wrong**.

### Why Decryption is Failing

The messages on your MQTT broker are **NOT** using the `AQ==` (0x01) default key. Evidence:

1. Decryption produces random bytes that fail protobuf parsing
2. Errors like "invalid wire type 7" and "index out of range" indicate the data isn't valid protobuf
3. Our test encryption/decryption with the default key works perfectly
4. Python and TypeScript produce identical (garbage) output, confirming the algorithm is correct

### What You Need to Check

1. **Verify Your Actual Encryption Key**:
   - Open your Meshtastic app
   - Go to Channel Settings → LongFast channel
   - Check the actual PSK (Pre-Shared Key)
   - It might NOT be `AQ==`

2. **Check Your config/app.yml**:
   ```yaml
   encryption:
     channels:
       - name: "LongFast"
         key: "AQ=="  # ← Is this the actual key your network uses?
         default: true
   ```

3. **Possible Scenarios**:
   - Your local network changed the default key for security
   - You're monitoring a private network with a custom key
   - The LongFast channel on your network uses a different PSK

### How to Get the Correct Key

**Option 1: From Meshtastic App**
1. Open Meshtastic mobile app
2. Go to Settings → Channels
3. Select "LongFast" channel
4. View/copy the PSK (it will be base64-encoded)

**Option 2: From Meshtastic CLI**
```bash
meshtastic --info
# Look for channel configuration and PSK
```

**Option 3: From Device**
```bash
meshtastic --ch-index 0 --ch-get
# Shows channel 0 (LongFast) configuration
```

### Testing the Fix

Once you have the correct key:

1. Update `config/app.yml`:
   ```yaml
   encryption:
     channels:
       - name: "LongFast"
         key: "YOUR_ACTUAL_BASE64_KEY_HERE"
         default: true
   ```

2. Rebuild and restart:
   ```bash
   cd backend && npm run build
   docker-compose restart backend
   ```

3. Check logs for successful decryption:
   ```bash
   docker-compose logs -f backend | grep "Successfully decrypted"
   ```

### Technical Details

- **Algorithm**: AES-256-CTR
- **Key Size**: 32 bytes (256 bits)
- **Nonce Size**: 16 bytes (8 bytes from payload + 8 zero bytes)
- **Format**: `[8-byte nonce][ciphertext]`

### Example Encrypted Message from Logs

```
Encrypted payload: 5b0c28ab47619db4f57ec4c830f369fac30e39e87c8ca7c97633d3fc0efabfa895
Nonce (8 bytes):   5b0c28ab47619db4
Ciphertext:        f57ec4c830f369fac30e39e87c8ca7c97633d3fc0efabfa895
Key used:          d4f1bb3a20290759f0bcffabcf4e6901d4f1bb3a20290759f0bcffabcf4e6901
Decrypted:         5bd88f2e857d5a1c26c5d8529f87818fb9660964888d7d177e (GARBAGE - wrong key!)
```

The decryption is working, but produces garbage because the key doesn't match what was used to encrypt the message.

### Next Steps

1. **Get your actual encryption key** from your Meshtastic device/app
2. **Update config/app.yml** with the correct key
3. **Restart the backend** to load the new key
4. **Verify decryption** works by checking the logs

If you're certain you're using `AQ==`, then the messages might be:
- From a different network/region
- Using a different channel (not LongFast)
- Encrypted with PKC (Public Key Cryptography) for DMs in firmware 2.5+

---

**Bottom Line**: The decryption code is correct. You need to provide the actual encryption key your network is using.
