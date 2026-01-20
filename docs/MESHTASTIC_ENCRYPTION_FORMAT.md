# Meshtastic Encryption Format

## Overview

Meshtastic uses AES-CTR (Counter Mode) encryption to protect message payloads. This document describes the encryption format and how to decrypt messages.

## Encryption Algorithm

- **Cipher:** AES (Advanced Encryption Standard)
- **Mode:** CTR (Counter Mode)
- **Key Size:** Typically 16 bytes (AES-128) or 32 bytes (AES-256)
- **Nonce Size:** 8 bytes (padded to 16 bytes for CTR mode)

## Encrypted Payload Structure

```
┌─────────────┬──────────────────────┐
│   Nonce     │     Ciphertext       │
│  (8 bytes)  │   (variable length)  │
└─────────────┴──────────────────────┘
```

### Nonce (8 bytes)
- Random 8-byte value generated for each message
- Provides uniqueness for the encryption
- Padded with 8 zero bytes to create 16-byte IV for CTR mode

### Ciphertext (variable length)
- Encrypted protobuf Data message
- Length depends on the original message size

## Encryption Process

### 1. Generate Nonce
```
nonce = random_bytes(8)
```

### 2. Pad Nonce for CTR Mode
```
iv = nonce + zeros(8)  // 16 bytes total
```

### 3. Encrypt Plaintext
```
cipher = AES-CTR(key, iv)
ciphertext = cipher.encrypt(plaintext)
```

### 4. Create Encrypted Payload
```
encrypted_payload = nonce + ciphertext
```

## Decryption Process

### 1. Extract Nonce
```
nonce = encrypted_payload[0:8]
```

### 2. Extract Ciphertext
```
ciphertext = encrypted_payload[8:]
```

### 3. Pad Nonce for CTR Mode
```
iv = nonce + zeros(8)  // 16 bytes total
```

### 4. Decrypt Ciphertext
```
decipher = AES-CTR(key, iv)
plaintext = decipher.decrypt(ciphertext)
```

### 5. Parse Protobuf
```
data_message = Data.decode(plaintext)
```

## Key Management

### Default Keys

Meshtastic has several default channel keys:

| Channel Name | Base64 Key | Hex Key | Description |
|--------------|------------|---------|-------------|
| LongFast     | `AQ==`     | `01`    | Default public channel (1 byte, padded) |
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

- Keys shorter than 16 bytes are padded with zeros for AES-128
- Keys of 16 bytes use AES-128-CTR
- Keys of 32 bytes use AES-256-CTR
- Keys between 16-32 bytes are truncated to 16 bytes

## Implementation Examples

### TypeScript (Node.js)

```typescript
import * as crypto from 'crypto';

function decrypt(encryptedPayload: Buffer, key: Buffer): Buffer | null {
  // Extract nonce (first 8 bytes)
  const nonce = Buffer.alloc(16, 0);
  encryptedPayload.copy(nonce, 0, 0, 8);
  
  // Extract ciphertext (remaining bytes)
  const ciphertext = encryptedPayload.slice(8);
  
  // Determine algorithm based on key length
  const algorithm = key.length === 16 ? 'aes-128-ctr' : 'aes-256-ctr';
  
  // Create decipher
  const decipher = crypto.createDecipheriv(algorithm, key, nonce);
  
  // Decrypt
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]);
}
```

### Python

```python
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

def decrypt(encrypted_payload: bytes, key: bytes) -> bytes:
    # Extract nonce (first 8 bytes) and pad to 16 bytes
    nonce = encrypted_payload[:8]
    nonce_padded = nonce + b'\x00' * 8
    
    # Extract ciphertext (remaining bytes)
    ciphertext = encrypted_payload[8:]
    
    # Create cipher
    cipher = Cipher(
        algorithms.AES(key),
        modes.CTR(nonce_padded),
        backend=default_backend()
    )
    decryptor = cipher.decryptor()
    
    # Decrypt
    plaintext = decryptor.update(ciphertext) + decryptor.finalize()
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
- Each message must use a unique nonce
- Reusing nonces with the same key compromises security
- Meshtastic generates random nonces for each message

### Key Rotation
- Consider rotating keys periodically
- Update all devices when changing keys
- Old messages cannot be decrypted with new keys

## Testing Decryption

### Test Vector

```
Key (base64):     "AQ=="
Key (hex):        "01"
Key (padded):     "01000000000000000000000000000000"

Nonce (hex):      "0123456789abcdef"
Plaintext:        "Hello, Meshtastic!"
Ciphertext (hex): (varies based on nonce)

Encrypted Payload: [nonce][ciphertext]
```

### Verification Steps

1. Decode base64 key
2. Pad key to 16 or 32 bytes if needed
3. Extract nonce from encrypted payload
4. Extract ciphertext from encrypted payload
5. Pad nonce to 16 bytes
6. Decrypt using AES-CTR
7. Parse protobuf Data message
8. Extract payload based on portnum

## Common Issues

### Wrong Key
**Symptom:** Decryption succeeds but protobuf parsing fails
**Solution:** Verify key matches the channel configuration

### Wrong Nonce Extraction
**Symptom:** Decryption produces garbage
**Solution:** Ensure nonce is extracted from first 8 bytes

### Wrong Algorithm
**Symptom:** Decryption fails or produces wrong output
**Solution:** Use AES-128-CTR for 16-byte keys, AES-256-CTR for 32-byte keys

### Payload Too Short
**Symptom:** Cannot extract nonce
**Solution:** Verify payload is at least 16 bytes (8-byte nonce + 8-byte minimum ciphertext)

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
