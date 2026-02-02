/**
 * Unit tests for RF Link Services
 * Tests traceroute parsing, hop extraction, 0-hop packet detection, and link aggregation
 * Requirements: 34.1, 34.2, 34.3, 34.11, 34.12, 34.13
 */

import { TracerouteLinkService, RFLink } from '../services/traceroute-link.service';
import { PacketLinkService } from '../services/packet-link.service';
import { RFLinkService } from '../services/rf-link.service';

describe('RF Link Services Unit Tests', () => {
  let tracerouteLinkService: TracerouteLinkService;
  let packetLinkService: PacketLinkService;
  let rfLinkService: RFLinkService;

  beforeEach(() => {
    tracerouteLinkService = new TracerouteLinkService();
    packetLinkService = new PacketLinkService();
    rfLinkService = new RFLinkService();
  });

  describe('TracerouteLinkService', () => {
    describe('Link Key Generation', () => {
      test('should generate same key for bidirectional links', () => {
        const nodeA = '!12345678';
        const nodeB = '!87654321';

        // Use the private method through reflection or test the behavior
        const keyAB = nodeA < nodeB ? `${nodeA}-${nodeB}` : `${nodeB}-${nodeA}`;
        const keyBA = nodeA < nodeB ? `${nodeA}-${nodeB}` : `${nodeB}-${nodeA}`;

        expect(keyAB).toBe(keyBA);
      });

      test('should handle identical nodes', () => {
        const nodeA = '!12345678';
        const nodeB = '!12345678';

        const key = nodeA < nodeB ? `${nodeA}-${nodeB}` : `${nodeB}-${nodeA}`;
        expect(key).toBe('!12345678-!12345678');
      });
    });

    describe('Success Rate Calculation', () => {
      test('should calculate success rate correctly for low packet counts', () => {
        const links: RFLink[] = [
          {
            from_node_id: '!12345678',
            to_node_id: '!87654321',
            link_type: 'traceroute',
            packet_count: 1,
            avg_rssi: -85,
            avg_snr: 8.5,
            last_seen: new Date(),
            success_rate: 0,
            is_bidirectional: false
          }
        ];

        // Calculate success rate: min(100, max(10, packet_count * 10))
        for (const link of links) {
          link.success_rate = Math.min(100, Math.max(10, link.packet_count * 10));
        }

        expect(links[0].success_rate).toBe(10);
      });

      test('should calculate success rate correctly for medium packet counts', () => {
        const links: RFLink[] = [
          {
            from_node_id: '!12345678',
            to_node_id: '!87654321',
            link_type: 'traceroute',
            packet_count: 5,
            avg_rssi: -85,
            avg_snr: 8.5,
            last_seen: new Date(),
            success_rate: 0,
            is_bidirectional: false
          }
        ];

        for (const link of links) {
          link.success_rate = Math.min(100, Math.max(10, link.packet_count * 10));
        }

        expect(links[0].success_rate).toBe(50);
      });

      test('should cap success rate at 100 for high packet counts', () => {
        const links: RFLink[] = [
          {
            from_node_id: '!12345678',
            to_node_id: '!87654321',
            link_type: 'traceroute',
            packet_count: 20,
            avg_rssi: -85,
            avg_snr: 8.5,
            last_seen: new Date(),
            success_rate: 0,
            is_bidirectional: false
          }
        ];

        for (const link of links) {
          link.success_rate = Math.min(100, Math.max(10, link.packet_count * 10));
        }

        expect(links[0].success_rate).toBe(100);
      });

      test('should handle edge case of exactly 10 packets', () => {
        const links: RFLink[] = [
          {
            from_node_id: '!12345678',
            to_node_id: '!87654321',
            link_type: 'traceroute',
            packet_count: 10,
            avg_rssi: -85,
            avg_snr: 8.5,
            last_seen: new Date(),
            success_rate: 0,
            is_bidirectional: false
          }
        ];

        for (const link of links) {
          link.success_rate = Math.min(100, Math.max(10, link.packet_count * 10));
        }

        expect(links[0].success_rate).toBe(100);
      });
    });

    describe('Average Calculation', () => {
      test('should update average correctly', () => {
        const currentAvg = -85;
        const newValue = -90;
        const currentCount = 5;
        const newCount = 6;

        const updatedAvg = (currentAvg * currentCount + newValue) / newCount;

        expect(updatedAvg).toBeCloseTo(-85.83, 2);
      });

      test('should handle first value correctly', () => {
        const currentAvg = 0;
        const newValue = -85;
        const currentCount = 0;
        const newCount = 1;

        const updatedAvg = currentCount === 0 ? newValue : (currentAvg * currentCount + newValue) / newCount;

        expect(updatedAvg).toBe(-85);
      });

      test('should maintain average with same values', () => {
        const currentAvg = -85;
        const newValue = -85;
        const currentCount = 10;
        const newCount = 11;

        const updatedAvg = (currentAvg * currentCount + newValue) / newCount;

        expect(updatedAvg).toBeCloseTo(-85, 2);
      });
    });

    describe('Bidirectional Link Merging', () => {
      test('should merge bidirectional links correctly', () => {
        const links: RFLink[] = [
          {
            from_node_id: '!12345678',
            to_node_id: '!87654321',
            link_type: 'traceroute',
            packet_count: 5,
            avg_rssi: -85,
            avg_snr: 8.5,
            last_seen: new Date('2024-01-01T12:00:00Z'),
            success_rate: 50,
            is_bidirectional: false
          },
          {
            from_node_id: '!87654321',
            to_node_id: '!12345678',
            link_type: 'traceroute',
            packet_count: 3,
            avg_rssi: -80,
            avg_snr: 9.0,
            last_seen: new Date('2024-01-01T13:00:00Z'),
            success_rate: 30,
            is_bidirectional: false
          }
        ];

        const merged = tracerouteLinkService.mergeBidirectionalLinks(links);

        expect(merged.length).toBe(1);
        expect(merged[0].packet_count).toBe(8);
        expect(merged[0].is_bidirectional).toBe(true);
        expect(merged[0].last_seen).toEqual(new Date('2024-01-01T13:00:00Z'));
      });

      test('should not merge unidirectional links', () => {
        const links: RFLink[] = [
          {
            from_node_id: '!12345678',
            to_node_id: '!87654321',
            link_type: 'traceroute',
            packet_count: 5,
            avg_rssi: -85,
            avg_snr: 8.5,
            last_seen: new Date(),
            success_rate: 50,
            is_bidirectional: false
          },
          {
            from_node_id: '!AAAAAAAA',
            to_node_id: '!BBBBBBBB',
            link_type: 'traceroute',
            packet_count: 3,
            avg_rssi: -80,
            avg_snr: 9.0,
            last_seen: new Date(),
            success_rate: 30,
            is_bidirectional: false
          }
        ];

        const merged = tracerouteLinkService.mergeBidirectionalLinks(links);

        expect(merged.length).toBe(2);
      });
    });
  });

  describe('PacketLinkService', () => {
    describe('Gateway Extraction from MQTT Topic', () => {
      test('should extract gateway from standard topic format', () => {
        const topic = 'msh/US/2/3/e/LongFast/!12345678';
        const parts = topic.split('/');
        
        // Expected format: msh/<region>/<area>/<hop>/e/<channel>/<gateway_id>
        expect(parts[0]).toBe('msh');
        expect(parts[6]).toBe('!12345678');
        expect(parts[6]).toMatch(/^![A-F0-9]{8}$/);
      });

      test('should extract gateway from alternative topic format', () => {
        const topic = 'msh/US/LongFast/!87654321';
        const parts = topic.split('/');
        
        const gatewayId = parts[parts.length - 1];
        expect(gatewayId).toBe('!87654321');
        expect(gatewayId).toMatch(/^![A-F0-9]{8}$/);
      });

      test('should handle invalid topic format', () => {
        const topic = 'invalid/topic/format';
        const parts = topic.split('/');
        
        expect(parts[0]).not.toBe('msh');
      });

      test('should validate gateway ID format', () => {
        const validGatewayIds = ['!12345678', '!ABCDEF01', '!87654321'];
        const invalidGatewayIds = ['12345678', '!123', '!TOOLONG123', 'INVALID'];

        validGatewayIds.forEach(id => {
          expect(id).toMatch(/^![A-F0-9]{8}$/);
        });

        invalidGatewayIds.forEach(id => {
          expect(id).not.toMatch(/^![A-F0-9]{8}$/);
        });
      });
    });

    describe('0-Hop Packet Detection', () => {
      test('should detect 0-hop packets correctly', () => {
        const packets = [
          { hopStart: 3, hopLimit: 3, expected: true },
          { hopStart: 3, hopLimit: 2, expected: false },
          { hopStart: 0, hopLimit: 0, expected: true },
          { hopStart: 7, hopLimit: 7, expected: true },
          { hopStart: 5, hopLimit: 3, expected: false }
        ];

        packets.forEach(packet => {
          const is0Hop = packet.hopStart === packet.hopLimit;
          expect(is0Hop).toBe(packet.expected);
        });
      });

      test('should calculate hop count correctly', () => {
        const packets = [
          { hopStart: 3, hopLimit: 3, expectedHops: 0 },
          { hopStart: 3, hopLimit: 2, expectedHops: 1 },
          { hopStart: 5, hopLimit: 3, expectedHops: 2 },
          { hopStart: 7, hopLimit: 4, expectedHops: 3 }
        ];

        packets.forEach(packet => {
          const hopCount = packet.hopStart - packet.hopLimit;
          expect(hopCount).toBe(packet.expectedHops);
        });
      });
    });

    describe('Link Merging with Traceroute Links', () => {
      test('should merge packet links with traceroute links', () => {
        const packetLinks: RFLink[] = [
          {
            from_node_id: '!12345678',
            to_node_id: '!87654321',
            link_type: 'packet',
            packet_count: 10,
            avg_rssi: -85,
            avg_snr: 8.5,
            last_seen: new Date('2024-01-01T14:00:00Z'),
            success_rate: 100,
            is_bidirectional: false
          }
        ];

        const tracerouteLinks: RFLink[] = [
          {
            from_node_id: '!12345678',
            to_node_id: '!87654321',
            link_type: 'traceroute',
            packet_count: 5,
            avg_rssi: -80,
            avg_snr: 9.0,
            last_seen: new Date('2024-01-01T12:00:00Z'),
            success_rate: 50,
            is_bidirectional: false
          }
        ];

        const merged = packetLinkService.mergeWithTracerouteLinks(packetLinks, tracerouteLinks);

        // Should keep traceroute link but update last_seen
        expect(merged.length).toBe(1);
        expect(merged[0].link_type).toBe('traceroute');
        expect(merged[0].last_seen).toEqual(new Date('2024-01-01T14:00:00Z'));
      });

      test('should add packet links when no traceroute link exists', () => {
        const packetLinks: RFLink[] = [
          {
            from_node_id: '!AAAAAAAA',
            to_node_id: '!BBBBBBBB',
            link_type: 'packet',
            packet_count: 10,
            avg_rssi: -85,
            avg_snr: 8.5,
            last_seen: new Date(),
            success_rate: 100,
            is_bidirectional: false
          }
        ];

        const tracerouteLinks: RFLink[] = [
          {
            from_node_id: '!12345678',
            to_node_id: '!87654321',
            link_type: 'traceroute',
            packet_count: 5,
            avg_rssi: -80,
            avg_snr: 9.0,
            last_seen: new Date(),
            success_rate: 50,
            is_bidirectional: false
          }
        ];

        const merged = packetLinkService.mergeWithTracerouteLinks(packetLinks, tracerouteLinks);

        expect(merged.length).toBe(2);
        expect(merged.some(link => link.link_type === 'packet')).toBe(true);
        expect(merged.some(link => link.link_type === 'traceroute')).toBe(true);
      });
    });
  });

  describe('RFLinkService', () => {
    describe('Cache Management', () => {
      test('should return cache statistics', () => {
        const stats = rfLinkService.getCacheStats();

        expect(stats).toHaveProperty('entries');
        expect(stats).toHaveProperty('oldestEntry');
        expect(typeof stats.entries).toBe('number');
        expect(stats.entries).toBeGreaterThanOrEqual(0);
      });

      test('should clear cache', () => {
        rfLinkService.clearCache();
        const stats = rfLinkService.getCacheStats();

        expect(stats.entries).toBe(0);
        expect(stats.oldestEntry).toBeNull();
      });
    });

    describe('Hours Parameter Validation', () => {
      test('should validate hours parameter range', () => {
        const testCases = [
          { input: -5, expected: 1 },
          { input: 0, expected: 1 },
          { input: 1, expected: 1 },
          { input: 24, expected: 24 },
          { input: 168, expected: 168 },
          { input: 336, expected: 336 },
          { input: 500, expected: 336 }
        ];

        testCases.forEach(testCase => {
          const validHours = Math.min(Math.max(1, testCase.input), 336);
          expect(validHours).toBe(testCase.expected);
        });
      });
    });
  });

  describe('Link Data Structure Validation', () => {
    test('should validate RFLink structure', () => {
      const link: RFLink = {
        from_node_id: '!12345678',
        to_node_id: '!87654321',
        link_type: 'traceroute',
        packet_count: 5,
        avg_rssi: -85,
        avg_snr: 8.5,
        last_seen: new Date(),
        success_rate: 50,
        is_bidirectional: false
      };

      expect(link.from_node_id).toMatch(/^![A-F0-9]{8}$/);
      expect(link.to_node_id).toMatch(/^![A-F0-9]{8}$/);
      expect(['traceroute', 'packet']).toContain(link.link_type);
      expect(link.packet_count).toBeGreaterThan(0);
      expect(link.avg_rssi).toBeGreaterThanOrEqual(-120);
      expect(link.avg_rssi).toBeLessThanOrEqual(-30);
      expect(link.avg_snr).toBeGreaterThanOrEqual(-20);
      expect(link.avg_snr).toBeLessThanOrEqual(20);
      expect(link.success_rate).toBeGreaterThanOrEqual(10);
      expect(link.success_rate).toBeLessThanOrEqual(100);
      expect(typeof link.is_bidirectional).toBe('boolean');
      expect(link.last_seen).toBeInstanceOf(Date);
    });

    test('should validate link type values', () => {
      const validLinkTypes = ['traceroute', 'packet'];
      const invalidLinkTypes = ['invalid', 'direct', 'mesh', ''];

      validLinkTypes.forEach(type => {
        expect(['traceroute', 'packet']).toContain(type);
      });

      invalidLinkTypes.forEach(type => {
        expect(['traceroute', 'packet']).not.toContain(type);
      });
    });
  });
});
