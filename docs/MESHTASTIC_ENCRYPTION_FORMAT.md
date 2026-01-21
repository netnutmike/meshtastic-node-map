# Meshtastic Encryption Format

## Overview

Meshtastic uses AES-CTR (Counter Mode) encryption to protect message payloads. This document describes the encryption format and how to decrypt messages.

## Encryption Algorithm

- **Cipher:** AES (Advanced Encryption Standard)
- **Mode:** CTR (Counter Mode)
- **Key Size:** 16 bytes (AES-128) or 32 bytes (AES-256)
- **Nonce Size:** 16 bytes (constructed from packet metadata)

## IMPORTANT: Nonce Construction

**The nonce is NOT embedded in the encrypted payload!**

The nonce is constructed from packet metadata:
- First 8 bytes: Packet ID (64-bit little-endian)
- Last 8 bytes: From Node ID (64-bit little-endian)

```python
# Python example
nonce_packet_id = packet.id.to_bytes(8, "little")
nonce_from_node = packet.from.to_bytes(8, "little")
nonce = nonce_packet_id + nonce_from_node  # 16 bytes total
```

```typescript
// TypeScript example
const nonce = Buffer.alloc(16, 0);
nonce.writeBigUInt64LE(BigInt(packetId), 0);
nonce.writeBigUInt64LE(BigInt(fromNodeId), 8);
```

## Encrypted Payload Structure

```
┌──────────────────────┐
│     Ciphertext       │
│   (variable length)  │
└──────────────────────┘
```

The encrypted payload contains ONLY the ciphertext. The nonce must be constructed from the packet's `id` and `from` fields.

## Encryption Process

### 1. Construct Nonce from Packet Metadata
```
nonce = packet_id (8 bytes LE) + from_node_id (8 bytes LE)
```

### 2. Encrypt Plaintext
```
cipher = AES-CTR(key, nonce)
ciphertext = cipher.encrypt(plaintext)
```

### 3. Create Encrypted Payload
```
encrypted_payload = ciphertext  // No nonce prefix!
```

## Decryption Process

### 1. Construct Nonce from Packet Metadata
```
nonce = packet_id (8 bytes LE) + from_node_id (8 bytes LE)
```

### 2. Decrypt Ciphertext
```
decipher = AES-CTR(key, nonce)
plaintext = decipher.decrypt(encrypted_payload)
```

### 3. Parse Protobuf
```
data_message = Data.decode(plaintext)
```

## Key Management

### Default Keys

Meshtastic has several default channel keys:

| Channel Name | Base64 Key | Hex Key | Description |
|--------------|------------|---------|-------------|
| LongFast (default) | `1PG7OiApB1nwvP+rz05pAQ==` | `d4f1bb3a20290759f0bcffabcf4e6901` | Default public channel (16 bytes) |
| LongFast (AQ==) | `AQ==` | `01` | 1-byte PSK (expanded to default key) |
| Primary      | (varies)   | (varies)| User-configured private channel |

### Key Format

Keys are stored as base64-encoded strings in configuration:

```yaml
encryption:
  channels:
    - name: "LongFast"
      key: "AQ=="  # Base64 encoded
      default: true
```

### Key Padding

- 1-byte keys (0x01-0x0A) are expanded to the Meshtastic default 16-byte key
- Keys shorter than 16 bytes are padded with zeros for AES-128
- 16-byte keys use AES-128-CTR
- Keys between 16-32 bytes are padded to 32 bytes for AES-256
- 32-byte keys use AES-256-CTR
- Keys longer than 32 bytes are truncated to 32 bytes

## Implementation Examples

### TypeScript (Node.js)

```typescript
import * as crypto from 'crypto';

function decrypt(
  encryptedPayload: Buffer, 
  packetId: number, 
  fromNodeId: number, 
  key: Buffer
): Buffer | null {
  // Construct nonce from packet metadata (16 bytes)
  const nonce = Buffer.alloc(16, 0);
  nonce.writeBigUInt64LE(BigInt(packetId), 0);
  nonce.writeBigUInt64LE(BigInt(fromNodeId), 8);
  
  // Determine algorithm based on key length
  const algorithm = key.length === 16 ? 'aes-128-ctr' : 'aes-256-ctr';
  
  // Create decipher
  const decipher = crypto.createDecipheriv(algorithm, key, nonce);
  
  // Decrypt (entire payload is ciphertext)
  return Buffer.concat([
    decipher.update(encryptedPayload),
    decipher.final()
  ]);
}
```

### Python

```python
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

def decrypt(encrypted_payload: bytes, packet_id: int, from_node_id: int, key: bytes) -> bytes:
    # Construct nonce from packet metadata (16 bytes)
    nonce_packet_id = packet_id.to_bytes(8, "little")
    nonce_from_node = from_node_id.to_bytes(8, "little")
    nonce = nonce_packet_id + nonce_from_node
    
    # Create cipher
    cipher = Cipher(
        algorithms.AES(key),
        modes.CTR(nonce),
        backend=default_backend()
    )
    decryptor = cipher.decryptor()
    
    # Decrypt (entire payload is ciphertext)
    plaintext = decryptor.update(encrypted_payload) + decryptor.finalize()
    return plaintext
```

## Protobuf Message Structure

After decryption, the plaintext is a protobuf `Data` message:

```protobuf
message Data {
  uint32 portnum = 1;        // Message type (NODEINFO, POSITION, etc.)
  bytes payload = 2;         // Type-specific payload
  bool want_response = 3;    // Request acknowledgment
  fixed32 dest = 4;          // Destination node ID
  fixed32 source = 5;        // Source node ID
  fixed32 request_id = 6;    // Request identifier
  fixed32 reply_id = 7;      // Reply identifier
  fixed32 emoji = 8;         // Emoji reaction
}
```

### Port Numbers (Message Types)

| Port Number | Name | Description |
|-------------|------|-------------|
| 1 | TEXT_MESSAGE_APP | Text messages |
| 3 | POSITION_APP | GPS position updates |
| 4 | NODEINFO_APP | Node information |
| 38 | TELEMETRY_APP | Device telemetry |
| 42 | NEIGHBORINFO_APP | Neighbor information |

## Security Considerations

### Key Distribution
- Keys must be securely shared between devices
- Default keys (like "AQ==") provide minimal security
- Use strong random keys for private channels

### Nonce Uniqueness
- Each message uses a unique nonce constructed from packet ID and source node
- Packet IDs increment for each message, ensuring nonce uniqueness
- The combination of packet ID and source node ID provides strong uniqueness guarantees

### Key Rotation
- Consider rotating keys periodically
- Update all devices when changing keys
- Old messages cannot be decrypted with new keys

## Testing Decryption

### Test Vector

```
Key (base64):     "1PG7OiApB1nwvP+rz05pAQ=="
Key (hex):        "d4f1bb3a20290759f0bcffabcf4e6901"

Packet ID:        12345
From Node ID:     67890
Nonce (hex):      "39300000000000003209010000000000"

Plaintext:        "Hello, Meshtastic!"
Ciphertext (hex): "ee04744a7e6f889f12c917af9fa9dcce23e9"

Encrypted Payload: [ciphertext only, no nonce prefix]
```

### Verification Steps

1. Decode base64 key
2. Pad key to 16 or 32 bytes if needed
3. Construct nonce from packet ID and from node ID (both as 8-byte little-endian)
4. Decrypt using AES-CTR with the constructed nonce
5. Parse protobuf Data message
6. Extract payload based on portnum

## Common Issues

### Wrong Key
**Symptom:** Decryption succeeds but protobuf parsing fails
**Solution:** Verify key matches the channel configuration

### Wrong Nonce Construction
**Symptom:** Decryption produces garbage or fails
**Solution:** Construct nonce from packet ID + from node ID (both 8-byte little-endian), don't extract from payload

### Missing Packet Metadata
**Symptom:** Cannot construct nonce
**Solution:** Ensure packet ID and from node ID are available from the MeshPacket

## References

- [Meshtastic Encryption Documentation](https://meshtastic.org/docs/overview/encryption/)
- [AES-CTR Mode](https://en.wikipedia.org/wiki/Block_cipher_mode_of_operation#Counter_(CTR))
- [Protocol Buffers](https://developers.google.com/protocol-buffers)
- [Meshtastic Protobufs](https://github.com/meshtastic/protobufs)

## Related Files

- `backend/src/services/encryption.service.ts` - TypeScript implementation
- `backend/src/services/protobuf-decoder.service.ts` - Protobuf decoder
- `meshtastic-mqtt-monitor-main/src/decoder.py` - Python reference implementation
- `config/app.yml` - Encryption configuration
