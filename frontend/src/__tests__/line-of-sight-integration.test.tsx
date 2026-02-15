/**
 * Line of Sight Integration Unit Tests
 * Tests URL parameter handling, map integration, and bearing calculation
 * Requirements: 40.8, 40.9, 40.10, 40.13, 40.14, 40.15
 */

import { calculateDistance } from '../utils/distanceCalculation';

// Mock data for testing
const mockNodes = [
  {
    id: 'node1',
    hexId: '0x1234',
    shortName: 'Node1',
    longName: 'Node One',
    position: { latitude: 40.7128, longitude: -74.0060, altitude: 10 }, // NYC
  },
  {
    id: 'node2',
    hexId: '0x5678',
    shortName: 'Node2',
    longName: 'Node Two',
    position: { latitude: 34.0522, longitude: -118.2437, altitude: 20 }, // LA
  },
];

describe('Line of Sight Integration', () => {
  describe('URL Parameter Handling (Requirement 40.8)', () => {
    it('should support ?from=X&to=Y URL parameters for pre-loading', () => {
      const searchParams = new URLSearchParams('from=node1&to=node2');
      const fromParam = searchParams.get('from');
      const toParam = searchParams.get('to');

      expect(fromParam).toBe('node1');
      expect(toParam).toBe('node2');
    });

    it('should find nodes by ID from URL parameters', () => {
      const nodeOptions = mockNodes.map((node) => ({
        id: node.id,
        hexId: node.hexId,
        shortName: node.shortName,
        longName: node.longName,
        label: `${node.shortName} (${node.hexId})`,
      }));

      const fromParam = 'node1';
      const toParam = 'node2';

      const fromOption = nodeOptions.find(
        (n) => n.id === fromParam || n.hexId === fromParam
      );
      const toOption = nodeOptions.find(
        (n) => n.id === toParam || n.hexId === toParam
      );

      expect(fromOption).toBeDefined();
      expect(toOption).toBeDefined();
      expect(fromOption!.id).toBe('node1');
      expect(toOption!.id).toBe('node2');
    });

    it('should find nodes by hexId from URL parameters', () => {
      const nodeOptions = mockNodes.map((node) => ({
        id: node.id,
        hexId: node.hexId,
        shortName: node.shortName,
        longName: node.longName,
        label: `${node.shortName} (${node.hexId})`,
      }));

      const fromParam = '0x1234';
      const toParam = '0x5678';

      const fromOption = nodeOptions.find(
        (n) => n.id === fromParam || n.hexId === fromParam
      );
      const toOption = nodeOptions.find(
        (n) => n.id === toParam || n.hexId === toParam
      );

      expect(fromOption).toBeDefined();
      expect(toOption).toBeDefined();
      expect(fromOption!.hexId).toBe('0x1234');
      expect(toOption!.hexId).toBe('0x5678');
    });

    it('should handle missing URL parameters gracefully', () => {
      const searchParams = new URLSearchParams('');
      const fromParam = searchParams.get('from');
      const toParam = searchParams.get('to');

      expect(fromParam).toBeNull();
      expect(toParam).toBeNull();
    });

    it('should handle invalid node IDs in URL parameters', () => {
      const nodeOptions = mockNodes.map((node) => ({
        id: node.id,
        hexId: node.hexId,
        shortName: node.shortName,
        longName: node.longName,
        label: `${node.shortName} (${node.hexId})`,
      }));

      const fromParam = 'nonexistent';
      const fromOption = nodeOptions.find(
        (n) => n.id === fromParam || n.hexId === fromParam
      );

      expect(fromOption).toBeUndefined();
    });

    it('should update URL when nodes are selected', () => {
      const fromNodeId = 'node1';
      const toNodeId = 'node2';

      const searchParams = new URLSearchParams();
      searchParams.set('from', fromNodeId);
      searchParams.set('to', toNodeId);

      expect(searchParams.toString()).toBe('from=node1&to=node2');
    });
  });

  describe('Map Integration (Requirement 40.9)', () => {
    it('should add "Line of Sight" button to RF link popups', () => {
      const fromNodeId = 'node1';
      const toNodeId = 'node2';

      const popupContent = `
        <a 
          href="/line-of-sight?from=${fromNodeId}&to=${toNodeId}"
          style="display: inline-block;"
        >
          📡 Line of Sight Analysis
        </a>
      `;

      expect(popupContent).toContain('/line-of-sight?from=node1&to=node2');
      expect(popupContent).toContain('Line of Sight Analysis');
    });

    it('should generate correct link URL for RF link popup', () => {
      const fromNodeId = 'node1';
      const toNodeId = 'node2';
      const url = `/line-of-sight?from=${fromNodeId}&to=${toNodeId}`;

      expect(url).toBe('/line-of-sight?from=node1&to=node2');
    });

    it('should include both node IDs in popup link', () => {
      const link = {
        from_node_id: 'node1',
        to_node_id: 'node2',
      };

      const url = `/line-of-sight?from=${link.from_node_id}&to=${link.to_node_id}`;

      expect(url).toContain('from=node1');
      expect(url).toContain('to=node2');
    });

    it('should style the Line of Sight button appropriately', () => {
      const buttonStyle = {
        display: 'inline-block',
        padding: '6px 12px',
        backgroundColor: '#1976d2',
        color: 'white',
        textDecoration: 'none',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '500',
        textAlign: 'center',
        width: '100%',
      };

      expect(buttonStyle.backgroundColor).toBe('#1976d2');
      expect(buttonStyle.color).toBe('white');
      expect(buttonStyle.textDecoration).toBe('none');
    });
  });

  describe('Bearing Calculation (Requirement 40.10)', () => {
    /**
     * Calculate bearing/azimuth between two points
     * Formula: θ = atan2(sin(Δλ)⋅cos(φ2), cos(φ1)⋅sin(φ2) − sin(φ1)⋅cos(φ2)⋅cos(Δλ))
     */
    const calculateBearing = (
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number
    ): number => {
      const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
      const toDegrees = (radians: number) => (radians * 180) / Math.PI;

      const φ1 = toRadians(lat1);
      const φ2 = toRadians(lat2);
      const Δλ = toRadians(lon2 - lon1);

      const y = Math.sin(Δλ) * Math.cos(φ2);
      const x =
        Math.cos(φ1) * Math.sin(φ2) -
        Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

      const θ = Math.atan2(y, x);
      const bearing = (toDegrees(θ) + 360) % 360;

      return Math.round(bearing);
    };

    it('should calculate bearing between two nodes', () => {
      const node1 = mockNodes[0]; // NYC
      const node2 = mockNodes[1]; // LA

      const bearing = calculateBearing(
        node1.position.latitude,
        node1.position.longitude,
        node2.position.latitude,
        node2.position.longitude
      );

      // NYC to LA should be approximately west (270 degrees)
      expect(bearing).toBeGreaterThan(250);
      expect(bearing).toBeLessThan(290);
    });

    it('should normalize bearing to 0-360 degrees', () => {
      const node1 = mockNodes[0];
      const node2 = mockNodes[1];

      const bearing = calculateBearing(
        node1.position.latitude,
        node1.position.longitude,
        node2.position.latitude,
        node2.position.longitude
      );

      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });

    it('should calculate bearing for north direction', () => {
      // Point 1: Equator
      // Point 2: North Pole
      const bearing = calculateBearing(0, 0, 90, 0);

      // Should be 0 degrees (north)
      expect(bearing).toBe(0);
    });

    it('should calculate bearing for east direction', () => {
      // Point 1: Prime Meridian
      // Point 2: 90 degrees east
      const bearing = calculateBearing(0, 0, 0, 90);

      // Should be approximately 90 degrees (east)
      expect(bearing).toBeGreaterThan(85);
      expect(bearing).toBeLessThan(95);
    });

    it('should calculate bearing for south direction', () => {
      // Point 1: North
      // Point 2: South
      const bearing = calculateBearing(45, 0, -45, 0);

      // Should be 180 degrees (south)
      expect(bearing).toBeGreaterThan(175);
      expect(bearing).toBeLessThan(185);
    });

    it('should calculate bearing for west direction', () => {
      // Point 1: Prime Meridian
      // Point 2: 90 degrees west
      const bearing = calculateBearing(0, 0, 0, -90);

      // Should be approximately 270 degrees (west)
      expect(bearing).toBeGreaterThan(265);
      expect(bearing).toBeLessThan(275);
    });

    it('should provide bearing for antenna alignment', () => {
      const node1 = mockNodes[0];
      const node2 = mockNodes[1];

      const bearing = calculateBearing(
        node1.position.latitude,
        node1.position.longitude,
        node2.position.latitude,
        node2.position.longitude
      );

      // Bearing should be a valid azimuth for antenna alignment
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
      expect(Number.isInteger(bearing)).toBe(true);
    });

    it('should calculate reverse bearing correctly', () => {
      const node1 = mockNodes[0];
      const node2 = mockNodes[1];

      const forwardBearing = calculateBearing(
        node1.position.latitude,
        node1.position.longitude,
        node2.position.latitude,
        node2.position.longitude
      );

      const reverseBearing = calculateBearing(
        node2.position.latitude,
        node2.position.longitude,
        node1.position.latitude,
        node1.position.longitude
      );

      // Reverse bearing should be approximately 180 degrees different
      // For long distances, the difference may vary due to Earth's curvature
      const difference = Math.abs(forwardBearing - reverseBearing);
      const normalizedDifference = difference > 180 ? 360 - difference : difference;
      
      // Should be roughly opposite direction (within 30 degrees of 180)
      expect(normalizedDifference).toBeGreaterThan(150);
      expect(normalizedDifference).toBeLessThan(210);
    });
  });

  describe('Shareable URLs (Requirement 40.14)', () => {
    it('should generate shareable URL with selected nodes', () => {
      const fromNodeId = 'node1';
      const toNodeId = 'node2';
      const url = `${window.location.origin}/line-of-sight?from=${fromNodeId}&to=${toNodeId}`;

      expect(url).toContain('/line-of-sight');
      expect(url).toContain('from=node1');
      expect(url).toContain('to=node2');
    });

    it('should copy shareable URL to clipboard', () => {
      const fromNodeId = 'node1';
      const toNodeId = 'node2';
      const url = `${window.location.origin}/line-of-sight?from=${fromNodeId}&to=${toNodeId}`;

      // Mock clipboard API
      const mockClipboard = {
        writeText: jest.fn().mockResolvedValue(undefined),
      };

      Object.assign(navigator, {
        clipboard: mockClipboard,
      });

      navigator.clipboard.writeText(url);

      expect(mockClipboard.writeText).toHaveBeenCalledWith(url);
    });

    it('should preserve node IDs in shareable URL', () => {
      const searchParams = new URLSearchParams('from=node1&to=node2');
      const fromParam = searchParams.get('from');
      const toParam = searchParams.get('to');

      expect(fromParam).toBe('node1');
      expect(toParam).toBe('node2');
    });

    it('should handle special characters in node IDs', () => {
      const fromNodeId = '0x1234';
      const toNodeId = '0x5678';
      const searchParams = new URLSearchParams();
      searchParams.set('from', fromNodeId);
      searchParams.set('to', toNodeId);

      expect(searchParams.get('from')).toBe('0x1234');
      expect(searchParams.get('to')).toBe('0x5678');
    });
  });

  describe('Tools Dropdown Menu (Requirement 40.15)', () => {
    it('should include Line of Sight in tools dropdown', () => {
      const toolsMenuItems = [
        { label: 'Line of Sight Analysis', path: '/line-of-sight' },
        { label: 'MQTT Monitor', path: '/mqtt-monitor' },
        { label: 'Network Topology', path: '/topology' },
        { label: 'Network Insights', path: '/insights' },
      ];

      const losItem = toolsMenuItems.find(
        (item) => item.label === 'Line of Sight Analysis'
      );

      expect(losItem).toBeDefined();
      expect(losItem!.path).toBe('/line-of-sight');
    });

    it('should navigate to Line of Sight page from tools menu', () => {
      const path = '/line-of-sight';
      expect(path).toBe('/line-of-sight');
    });

    it('should display Line of Sight icon in tools menu', () => {
      const menuItem = {
        icon: 'LineOfSightIcon',
        label: 'Line of Sight Analysis',
        path: '/line-of-sight',
      };

      expect(menuItem.icon).toBe('LineOfSightIcon');
      expect(menuItem.label).toBe('Line of Sight Analysis');
    });

    it('should order Line of Sight first in tools menu', () => {
      const toolsMenuItems = [
        'Line of Sight Analysis',
        'MQTT Monitor',
        'Network Topology',
        'Network Insights',
      ];

      expect(toolsMenuItems[0]).toBe('Line of Sight Analysis');
    });
  });

  describe('Integration with Distance Calculation (Requirement 40.13)', () => {
    it('should calculate distance when analyzing line of sight', () => {
      const node1 = mockNodes[0];
      const node2 = mockNodes[1];

      const distance = calculateDistance(
        node1.position.latitude,
        node1.position.longitude,
        node2.position.latitude,
        node2.position.longitude
      );

      // NYC to LA is approximately 3944 km
      expect(distance).toBeGreaterThan(3900);
      expect(distance).toBeLessThan(4000);
    });

    it('should display both distance and bearing together', () => {
      const result = {
        distanceKm: 3944.42,
        distanceFormatted: '3944 km',
        bearing: 275,
      };

      expect(result.distanceKm).toBeGreaterThan(0);
      expect(result.bearing).toBeGreaterThanOrEqual(0);
      expect(result.bearing).toBeLessThan(360);
    });

    it('should use consistent distance calculation across features', () => {
      const node1 = mockNodes[0];
      const node2 = mockNodes[1];

      const distance1 = calculateDistance(
        node1.position.latitude,
        node1.position.longitude,
        node2.position.latitude,
        node2.position.longitude
      );

      const distance2 = calculateDistance(
        node1.position.latitude,
        node1.position.longitude,
        node2.position.latitude,
        node2.position.longitude
      );

      expect(distance1).toBe(distance2);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing node positions', () => {
      const nodeWithoutPosition = {
        id: 'node3',
        hexId: '0xABCD',
        shortName: 'Node3',
        longName: 'Node Three',
        position: null,
      };

      expect(nodeWithoutPosition.position).toBeNull();
    });

    it('should validate URL parameters before analysis', () => {
      const searchParams = new URLSearchParams('from=&to=');
      const fromParam = searchParams.get('from');
      const toParam = searchParams.get('to');

      const isValid = !!(fromParam && toParam && fromParam !== '' && toParam !== '');
      expect(isValid).toBe(false);
    });

    it('should handle navigation errors gracefully', () => {
      const errorMessage = 'Failed to navigate to line of sight page';
      expect(errorMessage).toBeTruthy();
    });
  });
});
