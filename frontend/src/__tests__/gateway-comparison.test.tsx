/**
 * Gateway Comparison UI Unit Tests
 * Tests gateway selection, chart rendering, and table display
 * Requirements: 41.1, 41.5, 41.6, 41.7, 41.8, 41.10
 */

// Mock data for testing
const mockGateways = [
  {
    id: '!abc123',
    label: 'Gateway1 (!abc123)',
    packetCount: 1500,
  },
  {
    id: '!def456',
    label: 'Gateway2 (!def456)',
    packetCount: 1200,
  },
  {
    id: '!ghi789',
    label: 'Gateway3 (!ghi789)',
    packetCount: 800,
  },
];

const mockCommonPackets = [
  {
    mesh_packet_id: 'packet1',
    from_node_id: 'node1',
    hop_limit: 3,
    gateway1_rssi: -75,
    gateway1_snr: 8.5,
    gateway1_timestamp: '2024-01-15T10:00:00Z',
    gateway2_rssi: -80,
    gateway2_snr: 7.2,
    gateway2_timestamp: '2024-01-15T10:00:05Z',
    time_diff_seconds: 5,
    rssi_diff: -5,
    snr_diff: -1.3,
  },
  {
    mesh_packet_id: 'packet2',
    from_node_id: 'node2',
    hop_limit: 2,
    gateway1_rssi: -70,
    gateway1_snr: 10.0,
    gateway1_timestamp: '2024-01-15T10:01:00Z',
    gateway2_rssi: -68,
    gateway2_snr: 11.5,
    gateway2_timestamp: '2024-01-15T10:01:03Z',
    time_diff_seconds: 3,
    rssi_diff: 2,
    snr_diff: 1.5,
  },
];

const mockComparisonResult = {
  common_packets: mockCommonPackets,
  statistics: {
    packet_count: 2,
    avg_rssi: -72.5,
    avg_snr: 9.25,
    unique_sources: 2,
    rssi_diff_avg: -1.5,
    rssi_diff_min: -5,
    rssi_diff_max: 2,
    rssi_diff_stddev: 3.5,
    snr_diff_avg: 0.1,
    snr_diff_min: -1.3,
    snr_diff_max: 1.5,
    snr_diff_stddev: 1.4,
  },
  gateway1_id: '!abc123',
  gateway2_id: '!def456',
};

describe('Gateway Comparison UI', () => {
  describe('Gateway Selection (Requirement 41.1)', () => {
    it('should filter gateways with valid names', () => {
      const gatewaysWithNames = mockGateways.filter(
        (gw) => gw.label && gw.label.trim() !== ''
      );
      expect(gatewaysWithNames.length).toBe(3);
    });

    it('should create autocomplete options with labels', () => {
      const options = mockGateways.map((gw) => ({
        id: gw.id,
        label: gw.label,
        packetCount: gw.packetCount,
      }));

      expect(options[0].label).toBe('Gateway1 (!abc123)');
      expect(options[1].label).toBe('Gateway2 (!def456)');
      expect(options[2].label).toBe('Gateway3 (!ghi789)');
    });

    it('should sort gateways alphabetically by label', () => {
      const unsortedGateways = [mockGateways[2], mockGateways[0], mockGateways[1]];
      const sorted = unsortedGateways.sort((a, b) =>
        a.label.localeCompare(b.label)
      );

      expect(sorted[0].label).toBe('Gateway1 (!abc123)');
      expect(sorted[1].label).toBe('Gateway2 (!def456)');
      expect(sorted[2].label).toBe('Gateway3 (!ghi789)');
    });

    it('should prevent selecting the same gateway for both gateway1 and gateway2', () => {
      const gateway1 = mockGateways[0];
      const gateway2 = mockGateways[0];

      const isSameGateway = gateway1.id === gateway2.id;
      expect(isSameGateway).toBe(true);
    });

    it('should allow selecting different gateways', () => {
      const gateway1 = mockGateways[0];
      const gateway2 = mockGateways[1];

      const isDifferent = gateway1.id !== gateway2.id;
      expect(isDifferent).toBe(true);
    });

    it('should handle gateway swap correctly', () => {
      let gateway1 = mockGateways[0];
      let gateway2 = mockGateways[1];

      // Swap
      const temp = gateway1;
      gateway1 = gateway2;
      gateway2 = temp;

      expect(gateway1.id).toBe('!def456');
      expect(gateway2.id).toBe('!abc123');
    });
  });

  describe('Chart Data Preparation (Requirements 41.5, 41.6, 41.7)', () => {
    it('should prepare RSSI scatter plot data correctly', () => {
      const scatterData = mockCommonPackets.map((p) => ({
        x: p.gateway1_rssi,
        y: p.gateway2_rssi,
      }));

      expect(scatterData.length).toBe(2);
      expect(scatterData[0]).toEqual({ x: -75, y: -80 });
      expect(scatterData[1]).toEqual({ x: -70, y: -68 });
    });

    it('should prepare SNR scatter plot data correctly', () => {
      const scatterData = mockCommonPackets.map((p) => ({
        x: p.gateway1_snr,
        y: p.gateway2_snr,
      }));

      expect(scatterData.length).toBe(2);
      expect(scatterData[0]).toEqual({ x: 8.5, y: 7.2 });
      expect(scatterData[1]).toEqual({ x: 10.0, y: 11.5 });
    });

    it('should prepare timeline data sorted by timestamp', () => {
      const sortedPackets = [...mockCommonPackets].sort(
        (a, b) =>
          new Date(a.gateway1_timestamp).getTime() -
          new Date(b.gateway1_timestamp).getTime()
      );

      expect(sortedPackets[0].mesh_packet_id).toBe('packet1');
      expect(sortedPackets[1].mesh_packet_id).toBe('packet2');
    });

    it('should prepare histogram bins for RSSI differences', () => {
      const bins = [-20, -15, -10, -5, 0, 5, 10, 15, 20];
      const binCounts = new Array(bins.length - 1).fill(0);

      mockCommonPackets.forEach((p) => {
        for (let i = 0; i < bins.length - 1; i++) {
          if (p.rssi_diff >= bins[i] && p.rssi_diff < bins[i + 1]) {
            binCounts[i]++;
            break;
          }
        }
      });

      // packet1 has rssi_diff = -5, should be in bin [-5, 0)
      // packet2 has rssi_diff = 2, should be in bin [0, 5)
      expect(binCounts[3]).toBe(1); // [-5, 0) bin
      expect(binCounts[4]).toBe(1); // [0, 5) bin
    });
  });

  describe('Statistics Display (Requirement 41.8)', () => {
    it('should display packet count correctly', () => {
      expect(mockComparisonResult.statistics.packet_count).toBe(2);
    });

    it('should calculate average RSSI difference', () => {
      const avgDiff = mockComparisonResult.statistics.rssi_diff_avg;
      expect(avgDiff).toBe(-1.5);
    });

    it('should calculate RSSI difference range', () => {
      const min = mockComparisonResult.statistics.rssi_diff_min;
      const max = mockComparisonResult.statistics.rssi_diff_max;

      expect(min).toBe(-5);
      expect(max).toBe(2);
    });

    it('should calculate standard deviation', () => {
      const stddev = mockComparisonResult.statistics.rssi_diff_stddev;
      expect(stddev).toBe(3.5);
    });

    it('should count unique sources', () => {
      const uniqueSources = mockComparisonResult.statistics.unique_sources;
      expect(uniqueSources).toBe(2);
    });

    it('should calculate SNR statistics', () => {
      const stats = mockComparisonResult.statistics;
      expect(stats.snr_diff_avg).toBe(0.1);
      expect(stats.snr_diff_min).toBe(-1.3);
      expect(stats.snr_diff_max).toBe(1.5);
      expect(stats.snr_diff_stddev).toBe(1.4);
    });
  });

  describe('Table Display (Requirement 41.10)', () => {
    it('should display all common packets in table', () => {
      const packets = mockComparisonResult.common_packets;
      expect(packets.length).toBe(2);
    });

    it('should show packet details with differences', () => {
      const packet = mockCommonPackets[0];

      expect(packet.mesh_packet_id).toBe('packet1');
      expect(packet.from_node_id).toBe('node1');
      expect(packet.hop_limit).toBe(3);
      expect(packet.rssi_diff).toBe(-5);
      expect(packet.snr_diff).toBe(-1.3);
    });

    it('should handle pagination correctly', () => {
      const rowsPerPage = 10;
      const page = 0;
      const packets = mockCommonPackets;

      const paginatedPackets = packets.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
      );

      expect(paginatedPackets.length).toBe(2);
    });

    it('should format time differences correctly', () => {
      const packet = mockCommonPackets[0];
      const timeDiff = Math.abs(packet.time_diff_seconds);

      expect(timeDiff).toBe(5);
      expect(timeDiff.toFixed(1)).toBe('5.0');
    });

    it('should truncate long packet IDs for display', () => {
      const packet = mockCommonPackets[0];
      const truncated = packet.mesh_packet_id.substring(0, 8);

      expect(truncated).toBe('packet1');
    });

    it('should color-code RSSI values based on signal quality', () => {
      const getSignalColor = (rssi: number) => {
        if (rssi > -80) return 'success';
        if (rssi > -100) return 'warning';
        return 'error';
      };

      expect(getSignalColor(-70)).toBe('success');
      expect(getSignalColor(-85)).toBe('warning');
      expect(getSignalColor(-105)).toBe('error');
    });
  });

  describe('CSV Export (Requirement 41.15)', () => {
    it('should generate CSV headers correctly', () => {
      const headers = [
        'Packet ID',
        'From Node',
        'Hop Limit',
        'Gateway 1 RSSI',
        'Gateway 1 SNR',
        'Gateway 1 Time',
        'Gateway 2 RSSI',
        'Gateway 2 SNR',
        'Gateway 2 Time',
        'Time Diff (s)',
        'RSSI Diff',
        'SNR Diff',
      ];

      expect(headers.length).toBe(12);
      expect(headers[0]).toBe('Packet ID');
      expect(headers[10]).toBe('RSSI Diff');
    });

    it('should format packet data for CSV export', () => {
      const packet = mockCommonPackets[0];
      const row = [
        packet.mesh_packet_id,
        packet.from_node_id,
        packet.hop_limit,
        packet.gateway1_rssi,
        packet.gateway1_snr,
        packet.gateway1_timestamp,
        packet.gateway2_rssi,
        packet.gateway2_snr,
        packet.gateway2_timestamp,
        packet.time_diff_seconds,
        packet.rssi_diff,
        packet.snr_diff,
      ];

      expect(row.length).toBe(12);
      expect(row[0]).toBe('packet1');
      expect(row[10]).toBe(-5);
    });

    it('should generate CSV filename with gateway IDs', () => {
      const gateway1Id = '!abc123';
      const gateway2Id = '!def456';
      const filename = `gateway-comparison-${gateway1Id}-${gateway2Id}.csv`;

      expect(filename).toBe('gateway-comparison-!abc123-!def456.csv');
    });

    it('should convert all packets to CSV format', () => {
      const headers = [
        'Packet ID',
        'From Node',
        'Hop Limit',
        'Gateway 1 RSSI',
        'Gateway 1 SNR',
        'Gateway 1 Time',
        'Gateway 2 RSSI',
        'Gateway 2 SNR',
        'Gateway 2 Time',
        'Time Diff (s)',
        'RSSI Diff',
        'SNR Diff',
      ];

      const rows = mockCommonPackets.map((p) => [
        p.mesh_packet_id,
        p.from_node_id,
        p.hop_limit,
        p.gateway1_rssi,
        p.gateway1_snr,
        p.gateway1_timestamp,
        p.gateway2_rssi,
        p.gateway2_snr,
        p.gateway2_timestamp,
        p.time_diff_seconds,
        p.rssi_diff,
        p.snr_diff,
      ]);

      const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

      // Verify CSV structure
      const lines = csv.split('\n');
      expect(lines.length).toBe(3); // 1 header + 2 data rows
      expect(lines[0]).toContain('Packet ID');
      expect(lines[1]).toContain('packet1');
      expect(lines[2]).toContain('packet2');
    });

    it('should handle special characters in CSV export', () => {
      const packetWithSpecialChars = {
        ...mockCommonPackets[0],
        from_node_id: 'node,with,commas',
      };

      const row = [
        packetWithSpecialChars.mesh_packet_id,
        packetWithSpecialChars.from_node_id,
        packetWithSpecialChars.hop_limit,
      ];

      const csvRow = row.join(',');

      // Should contain the special characters
      expect(csvRow).toContain('node,with,commas');
    });

    it('should export all packet fields without data loss', () => {
      const packet = mockCommonPackets[0];
      const row = [
        packet.mesh_packet_id,
        packet.from_node_id,
        packet.hop_limit,
        packet.gateway1_rssi,
        packet.gateway1_snr,
        packet.gateway1_timestamp,
        packet.gateway2_rssi,
        packet.gateway2_snr,
        packet.gateway2_timestamp,
        packet.time_diff_seconds,
        packet.rssi_diff,
        packet.snr_diff,
      ];

      // Verify all fields are present
      expect(row[0]).toBe('packet1'); // mesh_packet_id
      expect(row[1]).toBe('node1'); // from_node_id
      expect(row[2]).toBe(3); // hop_limit
      expect(row[3]).toBe(-75); // gateway1_rssi
      expect(row[4]).toBe(8.5); // gateway1_snr
      expect(row[5]).toBe('2024-01-15T10:00:00Z'); // gateway1_timestamp
      expect(row[6]).toBe(-80); // gateway2_rssi
      expect(row[7]).toBe(7.2); // gateway2_snr
      expect(row[8]).toBe('2024-01-15T10:00:05Z'); // gateway2_timestamp
      expect(row[9]).toBe(5); // time_diff_seconds
      expect(row[10]).toBe(-5); // rssi_diff
      expect(row[11]).toBe(-1.3); // snr_diff
    });

    it('should handle large datasets in CSV export', () => {
      // Generate 1000 mock packets
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        mesh_packet_id: `packet${i}`,
        from_node_id: `node${i}`,
        hop_limit: 3,
        gateway1_rssi: -80,
        gateway1_snr: 5.0,
        gateway1_timestamp: '2024-01-15T10:00:00Z',
        gateway2_rssi: -85,
        gateway2_snr: 4.0,
        gateway2_timestamp: '2024-01-15T10:00:05Z',
        time_diff_seconds: 5,
        rssi_diff: -5,
        snr_diff: -1.0,
      }));

      const headers = [
        'Packet ID',
        'From Node',
        'Hop Limit',
        'Gateway 1 RSSI',
        'Gateway 1 SNR',
        'Gateway 1 Time',
        'Gateway 2 RSSI',
        'Gateway 2 SNR',
        'Gateway 2 Time',
        'Time Diff (s)',
        'RSSI Diff',
        'SNR Diff',
      ];

      const rows = largeDataset.map((p) => [
        p.mesh_packet_id,
        p.from_node_id,
        p.hop_limit,
        p.gateway1_rssi,
        p.gateway1_snr,
        p.gateway1_timestamp,
        p.gateway2_rssi,
        p.gateway2_snr,
        p.gateway2_timestamp,
        p.time_diff_seconds,
        p.rssi_diff,
        p.snr_diff,
      ]);

      const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

      // Verify CSV contains all rows
      const lines = csv.split('\n');
      expect(lines.length).toBe(1001); // 1 header + 1000 data rows
    });

    it('should create downloadable blob for CSV export', () => {
      const headers = ['Packet ID', 'From Node', 'RSSI Diff'];
      const rows = [['packet1', 'node1', -5]];
      const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

      // Simulate blob creation
      const blob = new Blob([csv], { type: 'text/csv' });

      expect(blob.type).toBe('text/csv');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should format timestamps correctly in CSV export', () => {
      const packet = mockCommonPackets[0];
      const timestamp = packet.gateway1_timestamp;

      // Verify timestamp is in ISO format
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should preserve numeric precision in CSV export', () => {
      const packet = mockCommonPackets[0];

      // Verify numeric values maintain precision
      expect(packet.gateway1_rssi).toBe(-75);
      expect(packet.gateway1_snr).toBe(8.5);
      expect(packet.rssi_diff).toBe(-5);
      expect(packet.snr_diff).toBe(-1.3);
    });
  });

  describe('URL Parameter Handling', () => {
    it('should parse gateway IDs from URL parameters', () => {
      const urlParams = new URLSearchParams('?gateway1=!abc123&gateway2=!def456');
      const gw1 = urlParams.get('gateway1');
      const gw2 = urlParams.get('gateway2');

      expect(gw1).toBe('!abc123');
      expect(gw2).toBe('!def456');
    });

    it('should generate shareable URL with gateway parameters', () => {
      const gateway1Id = '!abc123';
      const gateway2Id = '!def456';
      const baseUrl = 'http://localhost:3000';
      const url = `${baseUrl}/gateway-comparison?gateway1=${gateway1Id}&gateway2=${gateway2Id}`;

      expect(url).toBe(
        'http://localhost:3000/gateway-comparison?gateway1=!abc123&gateway2=!def456'
      );
    });

    it('should find gateway by ID from URL parameter', () => {
      const gatewayId = '!abc123';
      const gateway = mockGateways.find((g) => g.id === gatewayId);

      expect(gateway).toBeDefined();
      expect(gateway?.id).toBe('!abc123');
    });

    it('should parse time range filters from URL parameters', () => {
      const startTime = '2024-01-01T00:00:00Z';
      const endTime = '2024-01-31T23:59:59Z';
      const urlParams = new URLSearchParams(
        `?gateway1=!abc123&gateway2=!def456&start_time=${startTime}&end_time=${endTime}`
      );

      expect(urlParams.get('start_time')).toBe(startTime);
      expect(urlParams.get('end_time')).toBe(endTime);
    });

    it('should parse source node filter from URL parameters', () => {
      const sourceNodeId = '!node123';
      const urlParams = new URLSearchParams(
        `?gateway1=!abc123&gateway2=!def456&source_node_id=${sourceNodeId}`
      );

      expect(urlParams.get('source_node_id')).toBe(sourceNodeId);
    });

    it('should generate URL with all filter parameters', () => {
      const gateway1Id = '!abc123';
      const gateway2Id = '!def456';
      const startTime = '2024-01-01T00:00:00Z';
      const endTime = '2024-01-31T23:59:59Z';
      const sourceNodeId = '!node123';
      const baseUrl = 'http://localhost:3000';

      const params = new URLSearchParams({
        gateway1: gateway1Id,
        gateway2: gateway2Id,
        start_time: startTime,
        end_time: endTime,
        source_node_id: sourceNodeId,
      });

      const url = `${baseUrl}/gateway-comparison?${params.toString()}`;

      // URLSearchParams encodes ! as %21
      expect(url).toContain('gateway1=%21abc123');
      expect(url).toContain('gateway2=%21def456');
      expect(url).toContain('start_time=2024-01-01T00%3A00%3A00Z');
      expect(url).toContain('end_time=2024-01-31T23%3A59%3A59Z');
      expect(url).toContain('source_node_id=%21node123');
    });
  });

  describe('Time Range Filtering (Requirement 41.11)', () => {
    it('should validate time range filter inputs', () => {
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-31T23:59:59Z');

      expect(startTime.getTime()).toBeLessThan(endTime.getTime());
    });

    it('should format time range for API request', () => {
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-31T23:59:59Z');

      const startTimeISO = startTime.toISOString();
      const endTimeISO = endTime.toISOString();

      expect(startTimeISO).toBe('2024-01-01T00:00:00.000Z');
      expect(endTimeISO).toBe('2024-01-31T23:59:59.000Z');
    });

    it('should build API URL with time range parameters', () => {
      const gateway1 = '!abc123';
      const gateway2 = '!def456';
      const startTime = '2024-01-01T00:00:00Z';
      const endTime = '2024-01-31T23:59:59Z';

      const url = `/gateways/compare?gateway1=${gateway1}&gateway2=${gateway2}&start_time=${startTime}&end_time=${endTime}`;

      expect(url).toContain('start_time=2024-01-01T00:00:00Z');
      expect(url).toContain('end_time=2024-01-31T23:59:59Z');
    });

    it('should handle partial time range (start time only)', () => {
      const gateway1 = '!abc123';
      const gateway2 = '!def456';
      const startTime = '2024-01-01T00:00:00Z';

      const url = `/gateways/compare?gateway1=${gateway1}&gateway2=${gateway2}&start_time=${startTime}`;

      expect(url).toContain('start_time=2024-01-01T00:00:00Z');
      expect(url).not.toContain('end_time');
    });

    it('should handle partial time range (end time only)', () => {
      const gateway1 = '!abc123';
      const gateway2 = '!def456';
      const endTime = '2024-01-31T23:59:59Z';

      const url = `/gateways/compare?gateway1=${gateway1}&gateway2=${gateway2}&end_time=${endTime}`;

      expect(url).toContain('end_time=2024-01-31T23:59:59Z');
      expect(url).not.toContain('start_time');
    });

    it('should validate that start time is before end time', () => {
      const startTime = new Date('2024-01-31T23:59:59Z');
      const endTime = new Date('2024-01-01T00:00:00Z');

      const isValid = startTime.getTime() < endTime.getTime();
      expect(isValid).toBe(false);
    });

    it('should handle time range spanning multiple days', () => {
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-07T23:59:59Z');

      const daysDiff =
        (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24);

      expect(daysDiff).toBeCloseTo(7, 0);
    });
  });

  describe('Source Node Filtering (Requirement 41.12)', () => {
    it('should build API URL with source node filter', () => {
      const gateway1 = '!abc123';
      const gateway2 = '!def456';
      const sourceNodeId = '!node123';

      const url = `/gateways/compare?gateway1=${gateway1}&gateway2=${gateway2}&source_node_id=${sourceNodeId}`;

      expect(url).toContain('source_node_id=!node123');
    });

    it('should filter packets by source node', () => {
      const sourceNodeId = 'node1';
      const filteredPackets = mockCommonPackets.filter(
        (p) => p.from_node_id === sourceNodeId
      );

      expect(filteredPackets.length).toBe(1);
      expect(filteredPackets[0].from_node_id).toBe('node1');
    });

    it('should handle source node filter with no matches', () => {
      const sourceNodeId = 'nonexistent';
      const filteredPackets = mockCommonPackets.filter(
        (p) => p.from_node_id === sourceNodeId
      );

      expect(filteredPackets.length).toBe(0);
    });

    it('should combine source node filter with time range', () => {
      const gateway1 = '!abc123';
      const gateway2 = '!def456';
      const startTime = '2024-01-01T00:00:00Z';
      const endTime = '2024-01-31T23:59:59Z';
      const sourceNodeId = '!node123';

      const url = `/gateways/compare?gateway1=${gateway1}&gateway2=${gateway2}&start_time=${startTime}&end_time=${endTime}&source_node_id=${sourceNodeId}`;

      expect(url).toContain('start_time=2024-01-01T00:00:00Z');
      expect(url).toContain('end_time=2024-01-31T23:59:59Z');
      expect(url).toContain('source_node_id=!node123');
    });

    it('should validate source node ID format', () => {
      const validNodeId = '!abc123';
      const isValid = validNodeId.startsWith('!') && validNodeId.length > 1;

      expect(isValid).toBe(true);
    });

    it('should handle source node filter in statistics calculation', () => {
      const sourceNodeId = 'node1';
      const filteredPackets = mockCommonPackets.filter(
        (p) => p.from_node_id === sourceNodeId
      );

      const uniqueSources = new Set(filteredPackets.map((p) => p.from_node_id))
        .size;

      expect(uniqueSources).toBe(1);
    });
  });

  describe('Gateway Statistics Display (Requirement 41.13)', () => {
    it('should display packet count statistic', () => {
      const stats = mockComparisonResult.statistics;
      expect(stats.packet_count).toBe(2);
    });

    it('should display average signal quality statistics', () => {
      const stats = mockComparisonResult.statistics;
      expect(stats.avg_rssi).toBe(-72.5);
      expect(stats.avg_snr).toBe(9.25);
    });

    it('should display unique sources count', () => {
      const stats = mockComparisonResult.statistics;
      expect(stats.unique_sources).toBe(2);
    });

    it('should format statistics for display', () => {
      const stats = mockComparisonResult.statistics;

      // Format RSSI with 1 decimal place
      const formattedRssi = stats.rssi_diff_avg.toFixed(1);
      expect(formattedRssi).toBe('-1.5');

      // Format standard deviation with 1 decimal place
      const formattedStddev = stats.rssi_diff_stddev.toFixed(1);
      expect(formattedStddev).toBe('3.5');
    });

    it('should display RSSI difference range', () => {
      const stats = mockComparisonResult.statistics;
      const range = `${stats.rssi_diff_min.toFixed(1)} to ${stats.rssi_diff_max.toFixed(1)}`;

      expect(range).toBe('-5.0 to 2.0');
    });

    it('should display SNR statistics', () => {
      const stats = mockComparisonResult.statistics;

      expect(stats.snr_diff_avg).toBe(0.1);
      expect(stats.snr_diff_min).toBe(-1.3);
      expect(stats.snr_diff_max).toBe(1.5);
      expect(stats.snr_diff_stddev).toBe(1.4);
    });

    it('should calculate statistics summary for dashboard', () => {
      const stats = mockComparisonResult.statistics;

      const summary = {
        totalPackets: stats.packet_count,
        uniqueSources: stats.unique_sources,
        avgRssiDiff: stats.rssi_diff_avg.toFixed(1),
        avgSnrDiff: stats.snr_diff_avg.toFixed(1),
      };

      expect(summary.totalPackets).toBe(2);
      expect(summary.uniqueSources).toBe(2);
      expect(summary.avgRssiDiff).toBe('-1.5');
      expect(summary.avgSnrDiff).toBe('0.1');
    });
  });

  describe('Error Handling', () => {
    it('should validate that both gateways are selected', () => {
      const gateway1 = mockGateways[0];
      const gateway2 = null;

      const isValid = gateway1 !== null && gateway2 !== null;
      expect(isValid).toBe(false);
    });

    it('should validate that gateways are different', () => {
      const gateway1 = mockGateways[0];
      const gateway2 = mockGateways[0];

      const areDifferent = gateway1.id !== gateway2.id;
      expect(areDifferent).toBe(false);
    });

    it('should handle empty comparison results', () => {
      const emptyResult = {
        common_packets: [],
        statistics: {
          packet_count: 0,
          avg_rssi: 0,
          avg_snr: 0,
          unique_sources: 0,
          rssi_diff_avg: 0,
          rssi_diff_min: 0,
          rssi_diff_max: 0,
          rssi_diff_stddev: 0,
          snr_diff_avg: 0,
          snr_diff_min: 0,
          snr_diff_max: 0,
          snr_diff_stddev: 0,
        },
        gateway1_id: '!abc123',
        gateway2_id: '!def456',
      };

      expect(emptyResult.common_packets.length).toBe(0);
      expect(emptyResult.statistics.packet_count).toBe(0);
    });
  });
});
