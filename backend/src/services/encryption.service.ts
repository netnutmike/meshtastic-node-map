/**
 * Encryption Service for Meshtastic Messages
 * Handles decryption of encrypted protobuf messages using channel keys
 */

import * as crypto from 'crypto';
import { logger } from '../utils/logger';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

interface ChannelKey {
  name: string;
  key: string;
  default?: boolean;
}

interface EncryptionConfig {
  channels: ChannelKey[];
}

export class EncryptionService {
  private channelKeys: Map<number, Buffer> = new Map();
  private channelNameToIndex: Map<string, number> = new Map();
  private defaultKey: Buffer | null = null;

  constructor() {
    this.loadChannelKeys();
  }

  /**
   * Load channel keys from configuration
   */
  private loadChannelKeys(): void {
    try {
      // Try multiple possible config paths
      const possiblePaths = [
        path.join(process.cwd(), 'config/app.yml'),
        path.join(process.cwd(), '../config/app.yml'),
        path.join(__dirname, '../../config/app.yml'),
        path.join(__dirname, '../../../config/app.yml')
      ];

      let configPath: string | null = null;
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          configPath = testPath;
          break;
        }
      }

      if (!configPath) {
        logger.warn('Could not find app.yml configuration file');
        return;
      }

      logger.info(`Loading encryption config from: ${configPath}`);
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = yaml.load(configContent) as any;

      if (config.encryption && config.encryption.channels) {
        const channels: ChannelKey[] = config.encryption.channels;
        
        channels.forEach((channel, index) => {
          try {
            // Decode base64 key
            let keyBuffer = Buffer.from(channel.key, 'base64');
            
            logger.info(`Processing channel ${index} (${channel.name}): raw key length = ${keyBuffer.length}, first byte = 0x${keyBuffer[0]?.toString(16).padStart(2, '0')}`);
            
            // Meshtastic uses special 1-byte PSK shortcuts:
            // 0x00 = no encryption
            // 0x01 = default key (fixed 16-byte AES-128 key)
            // 0x02-0x0A = default key with last byte incremented (simple2-simple10)
            if (keyBuffer.length === 1) {
              const pskByte = keyBuffer[0];
              
              logger.info(`Detected 1-byte PSK: 0x${pskByte.toString(16).padStart(2, '0')}`);
              
              if (pskByte === 0x00) {
                // No encryption - skip this channel
                logger.info(`Channel ${index} (${channel.name}) has no encryption (PSK 0x00), skipping`);
                return;
              } else if (pskByte >= 0x01 && pskByte <= 0x0A) {
                // Meshtastic default key: d4 f1 bb 3a 20 29 07 59 f0 bc ff ab cf 4e 69 01
                // For PSK 0x02-0x0A, add (pskByte - 1) to the last byte
                // NOTE: Meshtastic uses AES-256-CTR, so we need to expand to 32 bytes
                // The 16-byte default key is repeated/padded to 32 bytes
                const defaultKey16 = Buffer.from([
                  0xd4, 0xf1, 0xbb, 0x3a, 0x20, 0x29, 0x07, 0x59,
                  0xf0, 0xbc, 0xff, 0xab, 0xcf, 0x4e, 0x69, 0x01
                ]);
                
                // Expand to 32 bytes by repeating the key
                const defaultKey32 = Buffer.alloc(32);
                defaultKey16.copy(defaultKey32, 0);
                defaultKey16.copy(defaultKey32, 16);
                
                if (pskByte > 0x01) {
                  // For simple2-simple10, increment the last byte
                  defaultKey32[15] = defaultKey32[15] + (pskByte - 0x01);
                  defaultKey32[31] = defaultKey32[31] + (pskByte - 0x01);
                  logger.info(`Mapped 1-byte PSK 0x${pskByte.toString(16).padStart(2, '0')} to Meshtastic simple${pskByte} key (32 bytes) for channel ${index}: ${channel.name}`);
                } else {
                  logger.info(`Mapped 1-byte PSK 0x01 to Meshtastic default key (32 bytes) for channel ${index}: ${channel.name}`);
                }
                
                keyBuffer = defaultKey32;
                logger.info(`After expansion: keyBuffer length = ${keyBuffer.length}`);
              } else {
                // Unknown 1-byte PSK, pad with zeros
                const paddedKey = Buffer.alloc(16, 0);
                keyBuffer.copy(paddedKey);
                keyBuffer = paddedKey;
                logger.warn(`Unknown 1-byte PSK 0x${pskByte.toString(16).padStart(2, '0')} for channel ${index}: ${channel.name}, padding with zeros`);
              }
            } else if (keyBuffer.length < 16) {
              // For keys shorter than 16 bytes (but not 1 byte), expand to 32 bytes for AES-256
              const expandedKey = Buffer.alloc(32, 0);
              keyBuffer.copy(expandedKey);
              // Repeat the key pattern
              for (let i = keyBuffer.length; i < 32; i++) {
                expandedKey[i] = keyBuffer[i % keyBuffer.length];
              }
              keyBuffer = expandedKey;
              logger.info(`Expanded encryption key for channel ${index}: ${channel.name} (${Buffer.from(channel.key, 'base64').length} -> 32 bytes)`);
            } else if (keyBuffer.length === 16) {
              // Expand 16-byte key to 32 bytes by repeating
              const expandedKey = Buffer.alloc(32);
              keyBuffer.copy(expandedKey, 0);
              keyBuffer.copy(expandedKey, 16);
              keyBuffer = expandedKey;
              logger.info(`Expanded 16-byte key to 32 bytes for channel ${index}: ${channel.name}`);
            } else if (keyBuffer.length > 16 && keyBuffer.length < 32) {
              // Pad to 32 bytes
              const paddedKey = Buffer.alloc(32, 0);
              keyBuffer.copy(paddedKey);
              keyBuffer = paddedKey;
              logger.info(`Padded encryption key for channel ${index}: ${channel.name} (${Buffer.from(channel.key, 'base64').length} -> 32 bytes)`);
            }
            
            logger.info(`Loaded encryption key for channel ${index}: ${channel.name} (${keyBuffer.length} bytes, base64: ${channel.key})`);
            
            // Store key by channel index
            this.channelKeys.set(index, keyBuffer);
            
            // Store channel name to index mapping
            this.channelNameToIndex.set(channel.name.toLowerCase(), index);
            
            // Set default key
            if (channel.default || index === 0) {
              this.defaultKey = keyBuffer;
              logger.info(`Set default encryption key from channel: ${channel.name}`);
            }
          } catch (error) {
            logger.error(`Failed to load encryption key for channel ${channel.name}:`, error);
          }
        });
      } else {
        logger.warn('No encryption configuration found in app.yml');
      }
    } catch (error) {
      logger.error('Failed to load encryption configuration:', error);
    }
  }

  /**
   * Decrypt an encrypted message payload
   * Meshtastic uses AES-128-CTR encryption with nonce embedded in the encrypted data
   * 
   * @param encryptedPayload - The encrypted payload buffer (nonce + ciphertext)
   * @param packetId - The packet ID (not used in current implementation)
   * @param channelIndex - The channel index (defaults to 0)
   * @returns Decrypted payload buffer or null if decryption fails
   */
  decrypt(encryptedPayload: Buffer, packetId: number, channelIndex: number = 0): Buffer | null {
    try {
      // Get the appropriate key
      let key: Buffer | undefined = this.channelKeys.get(channelIndex);
      
      // Fall back to default key if channel key not found
      if (!key && this.defaultKey) {
        key = this.defaultKey;
      }
      
      if (!key) {
        logger.warn('No encryption key available for decryption');
        return null;
      }

      // Meshtastic encrypted format: [8-byte nonce][ciphertext]
      // The nonce is the first 8 bytes of the encrypted data
      if (encryptedPayload.length < 16) {
        logger.warn('Encrypted payload too short (minimum 16 bytes required)');
        return null;
      }

      // Log the full encrypted payload for debugging
      logger.info(`=== DECRYPTION DEBUG ===`);
      logger.info(`Encrypted payload length: ${encryptedPayload.length} bytes`);
      logger.info(`Full encrypted payload (hex): ${encryptedPayload.toString('hex')}`);
      logger.info(`Packet ID: ${packetId}`);
      logger.info(`Channel index: ${channelIndex}`);
      logger.info(`Key (hex): ${key.toString('hex')}`);

      // Extract nonce (first 8 bytes) and pad to 16 bytes for CTR mode
      const nonce = Buffer.alloc(16, 0);
      encryptedPayload.copy(nonce, 0, 0, 8);
      
      // Extract ciphertext (everything after the 8-byte nonce)
      const ciphertext = encryptedPayload.slice(8);

      logger.info(`Nonce (8 bytes): ${encryptedPayload.slice(0, 8).toString('hex')}`);
      logger.info(`Nonce padded (16 bytes): ${nonce.toString('hex')}`);
      logger.info(`Ciphertext length: ${ciphertext.length} bytes`);
      logger.info(`Ciphertext (first 32 bytes): ${ciphertext.slice(0, 32).toString('hex')}`);

      // Determine the algorithm based on key length
      // Meshtastic uses AES-256-CTR (32-byte key)
      let algorithm: string;
      if (key.length === 32) {
        algorithm = 'aes-256-ctr';
      } else if (key.length === 16) {
        // Expand 16-byte key to 32 bytes for AES-256
        logger.info(`Expanding 16-byte key to 32 bytes for AES-256-CTR`);
        const expandedKey = Buffer.alloc(32);
        key.copy(expandedKey, 0);
        key.copy(expandedKey, 16);
        key = expandedKey;
        algorithm = 'aes-256-ctr';
      } else {
        logger.warn(`Unexpected key length: ${key.length} bytes, expected 16 or 32`);
        // Try to expand/pad to 32 bytes for AES-256
        algorithm = 'aes-256-ctr';
        if (key.length < 32) {
          // Pad key to 32 bytes
          const paddedKey = Buffer.alloc(32, 0);
          key.copy(paddedKey);
          // If key is 16 bytes or less, repeat it
          if (key.length <= 16) {
            key.copy(paddedKey, 16, 0, Math.min(key.length, 16));
          }
          key = paddedKey;
        } else {
          // Truncate to 32 bytes
          key = key.slice(0, 32);
        }
      }

      // Create decipher using AES-CTR
      const decipher = crypto.createDecipheriv(algorithm, key, nonce);
      
      // Decrypt the ciphertext
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
      ]);

      logger.info(`Decrypted length: ${decrypted.length} bytes`);
      logger.info(`Decrypted (first 64 bytes): ${decrypted.slice(0, Math.min(64, decrypted.length)).toString('hex')}`);
      logger.info(`Decrypted as ASCII: ${decrypted.slice(0, Math.min(64, decrypted.length)).toString('ascii').replace(/[^\x20-\x7E]/g, '.')}`);
      logger.info(`=== END DECRYPTION DEBUG ===`);
      
      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt message:', error);
      return null;
    }
  }

  /**
   * Check if a key is available for a channel
   */
  hasKey(channelIndex: number = 0): boolean {
    return this.channelKeys.has(channelIndex) || this.defaultKey !== null;
  }

  /**
   * Check if a key is available for a channel name
   */
  hasKeyForChannelName(channelName: string): boolean {
    const index = this.channelNameToIndex.get(channelName.toLowerCase());
    if (index !== undefined) {
      return this.channelKeys.has(index);
    }
    return false;
  }

  /**
   * Get channel index from channel name
   */
  getChannelIndex(channelName: string): number | undefined {
    return this.channelNameToIndex.get(channelName.toLowerCase());
  }

  /**
   * Get available channel indices
   */
  getAvailableChannels(): number[] {
    return Array.from(this.channelKeys.keys());
  }

  /**
   * Get available channel names
   */
  getAvailableChannelNames(): string[] {
    return Array.from(this.channelNameToIndex.keys());
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();
