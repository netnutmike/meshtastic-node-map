/**
 * Tests for Encryption Service
 * Verifies that decryption works correctly with Meshtastic encrypted messages
 */

import { encryptionService } from '../services/encryption.service';
import * as crypto from 'crypto';

describe('EncryptionService', () => {
  describe('decrypt', () => {
    it('should decrypt a message with embedded nonce', () => {
      // Test with a known key and message
      // Using AES-128-CTR with 16-byte key
      const key = Buffer.from('0123456789abcdef'); // 16-byte key
      const nonce = Buffer.from('0011223344556677', 'hex'); // 8-byte nonce
      const plaintext = Buffer.from('Hello, Meshtastic!');
      
      // Encrypt the message
      const noncePadded = Buffer.alloc(16, 0);
      nonce.copy(noncePadded, 0, 0, 8);
      
      const cipher = crypto.createCipheriv('aes-128-ctr', key, noncePadded);
      const ciphertext = Buffer.concat([
        cipher.update(plaintext),
        cipher.final()
      ]);
      
      // Create encrypted payload: [8-byte nonce][ciphertext]
      const encryptedPayload = Buffer.concat([nonce, ciphertext]);
      
      // Mock the encryption service to use our test key
      (encryptionService as any).channelKeys.set(0, key);
      (encryptionService as any).defaultKey = key;
      
      // Decrypt
      const decrypted = encryptionService.decrypt(encryptedPayload, 0, 0);
      
      expect(decrypted).not.toBeNull();
      expect(decrypted?.toString()).toBe('Hello, Meshtastic!');
    });

    it('should handle short encrypted payloads', () => {
      const shortPayload = Buffer.from('short');
      const decrypted = encryptionService.decrypt(shortPayload, 0, 0);
      
      expect(decrypted).toBeNull();
    });

    it('should return null when no key is available', () => {
      // Clear all keys
      (encryptionService as any).channelKeys.clear();
      (encryptionService as any).defaultKey = null;
      
      const encryptedPayload = Buffer.from('0011223344556677aabbccdd', 'hex');
      const decrypted = encryptionService.decrypt(encryptedPayload, 0, 0);
      
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
