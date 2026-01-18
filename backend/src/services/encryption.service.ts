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
            
            // Meshtastic uses keys that may be shorter than 32 bytes
            // Pad with zeros to reach 32 bytes for AES-256
            if (keyBuffer.length < 32) {
              const paddedKey = Buffer.alloc(32, 0);
              keyBuffer.copy(paddedKey);
              keyBuffer = paddedKey;
              logger.info(`Padded encryption key for channel ${index} (${channel.name}) from ${Buffer.from(channel.key, 'base64').length} to 32 bytes`);
            } else if (keyBuffer.length > 32) {
              // Truncate if too long
              keyBuffer = keyBuffer.slice(0, 32);
              logger.warn(`Truncated encryption key for channel ${index} (${channel.name}) from ${Buffer.from(channel.key, 'base64').length} to 32 bytes`);
            }
            
            // Store key by channel index
            this.channelKeys.set(index, keyBuffer);
            
            // Store channel name to index mapping
            this.channelNameToIndex.set(channel.name.toLowerCase(), index);
            
            // Set default key
            if (channel.default || index === 0) {
              this.defaultKey = keyBuffer;
              logger.info(`Set default encryption key from channel: ${channel.name}`);
            }
            
            logger.info(`Loaded encryption key for channel ${index}: ${channel.name} (${keyBuffer.length} bytes)`);
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
   * Meshtastic uses AES-256-CTR encryption with the packet ID as nonce
   * 
   * @param encryptedPayload - The encrypted payload buffer
   * @param packetId - The packet ID used as nonce
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

      // Meshtastic uses the packet ID as the nonce/IV
      // The nonce is 16 bytes: packet ID (4 bytes little-endian) + block counter (4 bytes) + zeros (8 bytes)
      const nonce = Buffer.alloc(16);
      
      // Write packet ID as little-endian 32-bit integer in first 4 bytes
      // JavaScript numbers are signed, but we need to treat packet ID as unsigned
      // Use a DataView to write the value correctly
      const view = new DataView(nonce.buffer, nonce.byteOffset, nonce.byteLength);
      view.setUint32(0, packetId, true); // true = little-endian
      // Block counter starts at 0 (bytes 4-7)
      view.setUint32(4, 0, true);
      // Remaining 8 bytes are already zeros

      logger.debug(`Decrypting with nonce: ${nonce.toString('hex')}, packet ID: ${packetId}, channel: ${channelIndex}`);

      // Create decipher using AES-256-CTR
      const decipher = crypto.createDecipheriv('aes-256-ctr', key, nonce);
      
      // Decrypt the payload
      const decrypted = Buffer.concat([
        decipher.update(encryptedPayload),
        decipher.final()
      ]);

      logger.debug(`Successfully decrypted payload (${encryptedPayload.length} -> ${decrypted.length} bytes)`);
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
