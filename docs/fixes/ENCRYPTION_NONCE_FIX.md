# Encryption Nonce Construction Fix

## Problem Identified

The decryption was failing because of an incorrect understanding of how Meshtastic constructs the encryption nonce.

### Previous (Incorrect) Implementation
- Assumed the nonce was embedded in the encrypted payload as the first 8 bytes
- Extracted nonce from `encryptedPayload.slice(0, 8)`
- Treated the rest as ciphertext

### Correct Implementation (from Python examples)
- The nonce is **NOT** embedded in the encrypted payload
- The nonce is constructed from packet metadata:
  - First 8 bytes: Packet ID (64-bit little-endian)
  - Last 8 bytes: From Node ID (64-bit little-endian)
- The entire encrypted payload is the ciphertext

## Key Findings from Python Example

The Python decryption code shows:
```python
nonce_packet_id = getattr(mp, "id").to_bytes(8, "little")
nonce_from_node = getattr(mp, "from").to_bytes(8, "little")
nonce = nonce_packet_id + nonce_from_node
```

This creates a 16-byte nonce from:
1. Packet ID → 8 bytes (little-endian)
2. From Node ID → 8 bytes (little-endian)

## Changes Made

### 1. Updated `encryption.service.ts`
- Changed method signature to accept `fromNodeId` parameter
- Construct nonce from packet metadata instead of extracting from payload
- Use `Buffer.writeBigUInt64LE()` to write 64-bit integers in little-endian format

```typescript
decrypt(encryptedPayload: Buffer, packetId: number, fromNodeId: number, channelIndex: number = 0)
```

### 2. Updated `protobuf-decoder.service.ts`
- Pass `packet.from` to the decrypt method
- Now provides all three required parameters: encrypted payload, packet ID, and from node ID

### 3. Updated Tests
- Modified encryption tests to match the new nonce construction
- Tests now create nonce from packet metadata instead of embedding it

## Default Key Verification

The Python example uses: `"1PG7OiApB1nwvP+rz05pAQ=="` (noted as "AKA AQ==")

When decoded:
- Python key: `d4f1bb3a20290759f0bcffabcf4e6901`
- Our key: `d4f1bb3a20290759f0bcffabcf4e6901`

✅ Keys match - this was not the issue.

## Testing

To test the fix:
1. Restart the backend service: `docker-compose restart backend`
2. Send encrypted messages from Meshtastic devices
3. Check logs for successful decryption with debug output
4. Verify decrypted messages appear in the UI

Run the encryption tests:
```bash
cd backend
npm test -- encryption.test.ts
```

All tests should pass, including the test that verifies decryption with packet metadata.

## Expected Behavior

With this fix, encrypted messages should now decrypt correctly because:
- The nonce is constructed exactly as Meshtastic does it
- The entire encrypted payload is treated as ciphertext
- Packet metadata (ID and from node) is used to derive the nonce

## References

- Python example: `example decryption.py`
- Meshtastic encryption format: `docs/MESHTASTIC_ENCRYPTION_FORMAT.md`
