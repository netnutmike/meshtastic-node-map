/**
 * Tests for Encryption Service
 * Verifies that decryption works correctly with Meshtastic encrypted messages
 */

import { encryptionService } from '../services/encryption.service';
import * as crypto from 'crypto';

describe('EncryptionService', () => {
  describe('decrypt', () => {
    it('should decrypt a message using packet metadata for nonce', () => {
      // Test with a known key and message matching Meshtastic format
      // Using AES-128-CTR with 16-byte key
      const key = Buffer.from('0123456789abcdef'); // 16-byte key
      const packetId = 12345;
      const fromNodeId = 67890;
      const plaintext = Buffer.from('Hello, Meshtastic!');
      
      // Construct nonce from packet metadata (matching Python implementation)
      const nonce = Buffer.alloc(16, 0);
      nonce.writeBigUInt64LE(BigInt(packetId), 0);
      nonce.writeBigUInt64LE(BigInt(fromNodeId), 8);
      
      // Encrypt the message
      const cipher = crypto.createCipheriv('aes-128-ctr', key, nonce);
      const ciphertext = Buffer.concat([
        cipher.update(plaintext),
        cipher.final()
      ]);
      
      // Mock the encryption service to use our test key
      (encryptionService as any).channelKeys.set(0, key);
      (encryptionService as any).defaultKey = key;
      
      // Decrypt (no nonce prefix in payload - it's constructed from metadata)
      const decrypted = encryptionService.decrypt(ciphertext, packetId, fromNodeId, 0);
      
      expect(decrypted).not.toBeNull();
      expect(decrypted?.toString()).toBe('Hello, Meshtastic!');
    });

    it('should handle empty encrypted payloads', () => {
      const emptyPayload = Buffer.from('');
      const decrypted = encryptionService.decrypt(emptyPayload, 0, 0, 0);
      
      expect(decrypted).toBeNull();
    });

    it('should return null when no key is available', () => {
      // Clear all keys
      (encryptionService as any).channelKeys.clear();
      (encryptionService as any).defaultKey = null;
      
      const encryptedPayload = Buffer.from('aabbccdd', 'hex');
      const decrypted = encryptionService.decrypt(encryptedPayload, 0, 0, 0);
      
      expect(decrypted).toBeNull();
    });

    it('should use the correct key for different channels', () => {
      const key1 = Buffer.from('key1key1key1key1'); // 16 bytes
      const key2 = Buffer.from('key2key2key2key2'); // 16 bytes
      
      (encryptionService as any).channelKeys.set(0, key1);
      (encryptionService as any).channelKeys.set(1, key2);
      (encryptionService as any).defaultKey = key1;
      
      expect(encryptionService.hasKey(0)).toBe(true);
      expect(encryptionService.hasKey(1)).toBe(true);
      expect(encryptionService.hasKey(2)).toBe(true); // Should fall back to default
    });
  });

  describe('channel management', () => {
    it('should map channel names to indices', () => {
      (encryptionService as any).channelNameToIndex.set('longfast', 0);
      (encryptionService as any).channelNameToIndex.set('primary', 1);
      
      expect(encryptionService.getChannelIndex('longfast')).toBe(0);
      expect(encryptionService.getChannelIndex('primary')).toBe(1);
      expect(encryptionService.getChannelIndex('unknown')).toBeUndefined();
    });

    it('should check if key exists for channel name', () => {
      (encryptionService as any).channelKeys.set(0, Buffer.from('test'));
      (encryptionService as any).channelNameToIndex.set('longfast', 0);
      
      expect(encryptionService.hasKeyForChannelName('longfast')).toBe(true);
      expect(encryptionService.hasKeyForChannelName('unknown')).toBe(false);
    });
  });
});
