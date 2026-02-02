import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import './PacketsPage.css';

/**
 * Packets Page Component
 * Displays packets with optional grouping functionality and advanced filters
 * Requirements: 38.1, 38.2, 38.3, 38.4, 38.5, 38.6, 38.7, 38.8, 38.9, 38.10, 38.11, 38.12
 */

interface GroupedPacket {
  mesh_packet_id: string;
  from_node_id: string;
  to_node_id: string | null;
  portnum: number;
  portnum_name: string;
  gateway_count: number;
  gateway_list: string[];
  rssi_min: number;
  rssi_max: number;
  snr_min: number;
  snr_max: number;
  hop_count_min: number;
  hop_count_max: number;
  reception_count: number;
  relay_nodes_formatted: string;
  first_seen: Date;
  last_seen: Date;
  text_content?: string; // TEXT_MESSAGE_APP decoded content
}

interface UngroupedPacket {
  id: string;
  messageId: string;
  fromNodeId: string;
  toNodeId: string | null;
  type: string;
  content: any;
  hopStart: number;
  hopLimit: number;
  rssi: number;
  snr: number;
  timestamp: Date;
  topic: string;
  fromNode?: {
    shortName?: string;
    longName?: string;
  };
  toNode?: {
    shortName?: string;
    longName?: string;
  };
}

interface PacketFilters {
  startTime?: string;
  endTime?: string;
  fromNodeId?: string;
  toNodeId?: string;
  excludeFromNodeId?: string;
  excludeToNodeId?: string;
  gatewayId?: string;
  portnum?: number;
  hopCount?: 'any' | 'direct' | '1' | '2' | '3' | '4+';
  rssiMin?: number;
  rssiMax?: number;
  snrMin?: number;
  snrMax?: number;
  primaryChannel?: number;
  excludeGatewaySelfMessages?: boolean;
  searchContent?: string; // Search in message content
}

interface PacketsPageState {
  packets: (GroupedPacket | UngroupedPacket)[];
  loading: boolean;
  error: string | null;
  groupByPacketId: boolean;
  filters: PacketFilters;
  showFilters: boolean;
  nodes: Array<{ id: string; shortName: string; longName: string }>;
  gateways: Array<{ id: string; name: string }>;
}

const PORT_NUMBERS = [
  { value: 1, label: 'TEXT_MESSAGE_APP' },
  { value: 3, label: 'POSITION_APP' },
  { value: 4, label: 'NODEINFO_APP' },
  { value: 5, label: 'ROUTING_APP' },
  { value: 6, label: 'ADMIN_APP' },
  { value: 67, label: 'TELEMETRY_APP' },
  { value: 70, label: 'TRACEROUTE_APP' },
  { value: 71, label: 'NEIGHBOR_INFO_APP' },
];

const HOP_COUNT_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: 'direct', label: 'Direct (0 hops)' },
  { value: '1', label: '1 hop' },
  { value: '2', label: '2 hops' },
  { value: '3', label: '3 hops' },
  { value: '4+', label: '4+ hops' },
];

// Helper functions
const urlParamsToFilters = (params: URLSearchParams): PacketFilters => {
  const filters: PacketFilters = {};
  
  const startTime = params.get('startTime');
  if (startTime) filters.startTime = startTime;
  
  const endTime = params.get('endTime');
  if (endTime) filters.endTime = endTime;
  
  const fromNodeId = params.get('fromNodeId');
  if (fromNodeId) filters.fromNodeId = fromNodeId;
  
  const toNodeId = params.get('toNodeId');
  if (toNodeId) filters.toNodeId = toNodeId;
  
  const excludeFromNodeId = params.get('excludeFromNodeId');
  if (excludeFromNodeId) filters.excludeFromNodeId = excludeFromNodeId;
  
  const excludeToNodeId = params.get('excludeToNodeId');
  if (excludeToNodeId) filters.excludeToNodeId = excludeToNodeId;
  
  const gatewayId = params.get('gatewayId');
  if (gatewayId) filters.gatewayId = gatewayId;
  
  const portnum = params.get('portnum');
  if (portnum) filters.portnum = parseInt(portnum, 10);
  
  const hopCount = params.get('hopCount');
  if (hopCount) filters.hopCount = hopCount as PacketFilters['hopCount'];
  
  const rssiMin = params.get('rssiMin');
  if (rssiMin) filters.rssiMin = parseFloat(rssiMin);
  
  const rssiMax = params.get('rssiMax');
  if (rssiMax) filters.rssiMax = parseFloat(rssiMax);
  
  const snrMin = params.get('snrMin');
  if (snrMin) filters.snrMin = parseFloat(snrMin);
  
  const snrMax = params.get('snrMax');
  if (snrMax) filters.snrMax = parseFloat(snrMax);
  
  const primaryChannel = params.get('primaryChannel');
  if (primaryChannel) filters.primaryChannel = parseInt(primaryChannel, 10);
  
  const excludeGatewaySelfMessages = params.get('excludeGatewaySelfMessages');
  if (excludeGatewaySelfMessages === 'true') filters.excludeGatewaySelfMessages = true;
  
  const searchContent = params.get('searchContent');
  if (searchContent) filters.searchContent = searchContent;
  
  return filters;
};

const filtersToUrlParams = (filters: PacketFilters): URLSearchParams => {
  const params = new URLSearchParams();
  
  if (filters.startTime) params.set('startTime', filters.startTime);
  if (filters.endTime) params.set('endTime', filters.endTime);
  if (filters.fromNodeId) params.set('fromNodeId', filters.fromNodeId);
  if (filters.toNodeId) params.set('toNodeId', filters.toNodeId);
  if (filters.excludeFromNodeId) params.set('excludeFromNodeId', filters.excludeFromNodeId);
  if (filters.excludeToNodeId) params.set('excludeToNodeId', filters.excludeToNodeId);
  if (filters.gatewayId) params.set('gatewayId', filters.gatewayId);
  if (filters.portnum !== undefined) params.set('portnum', filters.portnum.toString());
  if (filters.hopCount) params.set('hopCount', filters.hopCount);
  if (filters.rssiMin !== undefined) params.set('rssiMin', filters.rssiMin.toString());
  if (filters.rssiMax !== undefined) params.set('rssiMax', filters.rssiMax.toString());
  if (filters.snrMin !== undefined) params.set('snrMin', filters.snrMin.toString());
  if (filters.snrMax !== undefined) params.set('snrMax', filters.snrMax.toString());
  if (filters.primaryChannel !== undefined) params.set('primaryChannel', filters.primaryChannel.toString());
  if (filters.excludeGatewaySelfMessages) params.set('excludeGatewaySelfMessages', 'true');
  if (filters.searchContent) params.set('searchContent', filters.searchContent);
  
  return params;
};

const extractGatewayFromTopic = (topic: string | null): string => {
  if (!topic) return 'unknown';
  const parts = topic.split('/');
  if (parts.length >= 6) {
    return parts[5];
  }
  return 'unknown';
};

const getTypeFromPortnum = (portnum: number): string => {
  const port = PORT_NUMBERS.find(p => p.value === portnum);
  return port ? port.label : '';
};

/**
 * Sanitize text content for safe display
 * Requirement 38.13: Handle different text encodings and sanitize message content
 */
const sanitizeTextContent = (content: any): string => {
  if (!content) return '';
  
  // If content is a string, sanitize it
  if (typeof content === 'string') {
    // Remove any HTML tags
    const withoutHtml = content.replace(/<[^>]*>/g, '');
    // Escape special characters
    const escaped = withoutHtml
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    return escaped;
  }
  
  // If content is an object, it might be JSON
  if (typeof content === 'object') {
    // Check if it's a Buffer or has text property
    if (content.text) {
      return sanitizeTextContent(content.text);
    }
    // Otherwise return empty string for non-text content
    return '';
  }
  
  return String(content);
};

/**
 * Extract text content from message
 * Requirement 38.13: Decode and display text message content
 */
const extractTextContent = (packet: any): string => {
  // Only extract content for TEXT_MESSAGE_APP
  if (packet.portnum_name !== 'TEXT_MESSAGE_APP' && packet.type !== 'TEXT') {
    return '';
  }
  
  if (packet.content) {
    return sanitizeTextContent(packet.content);
  }
  
  return '';
};

const PacketsPage: React.FC = () => {
  const [state, setState] = useState<PacketsPageState>({
    packets: [],
    loading: false,
    error: null,
    groupByPacketId: false,
    filters: {},
    showFilters: false,
    nodes: [],
    gateways: []
  });

  useEffect(() => {
    // Load filters from URL on mount
    const params = new URLSearchParams(window.location.search);
    const urlFilters = urlParamsToFilters(params);
    
    if (Object.keys(urlFilters).length > 0) {
      setState(prev => ({ ...prev, filters: urlFilters, showFilters: true }));
    }

    // Fetch nodes and gateways for dropdowns
    fetchNodesAndGateways();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchPackets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.groupByPacketId, state.filters]);

  const fetchNodesAndGateways = async () => {
    try {
      const nodesResponse = await apiService.get('/api/v1/nodes');
      const nodes = nodesResponse.data.map((node: any) => ({
        id: node.id,
        shortName: node.shortName || node.id,
        longName: node.longName || node.shortName || node.id
      }));

      // Extract unique gateways from messages
      const gatewaysResponse = await apiService.get('/api/v1/messages?limit=1000');
      const gatewaySet = new Set<string>();
      gatewaysResponse.data.forEach((msg: any) => {
        if (msg.topic) {
          const parts = msg.topic.split('/');
          if (parts.length >= 6) {
            gatewaySet.add(parts[5]);
          }
        }
      });

      const gateways = Array.from(gatewaySet).map(id => ({
        id,
        name: id
      }));

      setState(prev => ({ ...prev, nodes, gateways }));
    } catch (error) {
      console.error('Error fetching nodes and gateways:', error);
    }
  };

  const applyClientSideFilters = (packets: any[], filters: PacketFilters): any[] => {
    return packets.filter(packet => {
      // Exclude from node filter
      if (filters.excludeFromNodeId && packet.from_node_id === filters.excludeFromNodeId) {
        return false;
      }

      // Exclude to node filter
      if (filters.excludeToNodeId && packet.to_node_id === filters.excludeToNodeId) {
        return false;
      }

      // Gateway filter
      if (filters.gatewayId) {
        if (state.groupByPacketId) {
          if (!packet.gateway_list || !packet.gateway_list.includes(filters.gatewayId)) {
            return false;
          }
        } else {
          const gatewayId = extractGatewayFromTopic(packet.topic);
          if (gatewayId !== filters.gatewayId) {
            return false;
          }
        }
      }

      // Hop count filter
      if (filters.hopCount && filters.hopCount !== 'any') {
        const hopCount = state.groupByPacketId 
          ? packet.hop_count_min 
          : (packet.hopStart || 0) - (packet.hopLimit || 0);
        
        switch (filters.hopCount) {
          case 'direct':
            if (hopCount !== 0) return false;
            break;
          case '1':
            if (hopCount !== 1) return false;
            break;
          case '2':
            if (hopCount !== 2) return false;
            break;
          case '3':
            if (hopCount !== 3) return false;
            break;
          case '4+':
            if (hopCount < 4) return false;
            break;
        }
      }

      // RSSI range filter
      if (filters.rssiMin !== undefined) {
        const rssi = state.groupByPacketId ? packet.rssi_max : packet.rssi;
        if (rssi < filters.rssiMin) return false;
      }
      if (filters.rssiMax !== undefined) {
        const rssi = state.groupByPacketId ? packet.rssi_min : packet.rssi;
        if (rssi > filters.rssiMax) return false;
      }

      // SNR range filter
      if (filters.snrMin !== undefined) {
        const snr = state.groupByPacketId ? packet.snr_max : packet.snr;
        if (snr < filters.snrMin) return false;
      }
      if (filters.snrMax !== undefined) {
        const snr = state.groupByPacketId ? packet.snr_min : packet.snr;
        if (snr > filters.snrMax) return false;
      }

      // Primary channel filter
      if (filters.primaryChannel !== undefined && packet.channel !== filters.primaryChannel) {
        return false;
      }

      // Exclude gateway self messages
      if (filters.excludeGatewaySelfMessages) {
        const gatewayId = state.groupByPacketId 
          ? packet.gateway_list?.[0] 
          : extractGatewayFromTopic(packet.topic);
        if (packet.from_node_id === gatewayId || packet.fromNodeId === gatewayId) {
          return false;
        }
      }

      // Search in message content (Requirement 38.13)
      if (filters.searchContent) {
        const searchLower = filters.searchContent.toLowerCase();
        const textContent = state.groupByPacketId 
          ? (packet as GroupedPacket).text_content 
          : extractTextContent(packet);
        
        if (!textContent || !textContent.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  };

  const fetchPackets = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const params = new URLSearchParams();
      
      // Apply filters to API request
      if (state.filters.startTime) params.append('startDate', state.filters.startTime);
      if (state.filters.endTime) params.append('endDate', state.filters.endTime);
      if (state.filters.fromNodeId) params.append('fromNodeId', state.filters.fromNodeId);
      if (state.filters.toNodeId) params.append('toNodeId', state.filters.toNodeId);
      if (state.filters.portnum !== undefined) params.append('type', getTypeFromPortnum(state.filters.portnum));
      if (state.filters.searchContent) params.append('search', state.filters.searchContent);

      const endpoint = state.groupByPacketId 
        ? `/api/v1/messages/grouped?${params.toString()}`
        : `/api/v1/messages?${params.toString()}`;

      const response = await apiService.get(endpoint);
      
      // Apply client-side filters that aren't supported by the API
      let packets = response.data || [];
      
      // For ungrouped packets, extract text content
      if (!state.groupByPacketId) {
        packets = packets.map((packet: any) => ({
          ...packet,
          text_content: extractTextContent(packet)
        }));
      }
      
      packets = applyClientSideFilters(packets, state.filters);

      setState(prev => ({
        ...prev,
        packets,
        loading: false
      }));

      // Update URL with current filters
      updateUrlWithFilters(state.filters);
    } catch (error) {
      console.error('Error fetching packets:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to fetch packets',
        loading: false
      }));
    }
  };

  const updateUrlWithFilters = (filters: PacketFilters) => {
    const params = filtersToUrlParams(filters);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  };

  const toggleGrouping = () => {
    setState(prev => ({
      ...prev,
      groupByPacketId: !prev.groupByPacketId
    }));
  };

  const toggleFilters = () => {
    setState(prev => ({
      ...prev,
      showFilters: !prev.showFilters
    }));
  };

  const updateFilter = (key: keyof PacketFilters, value: any) => {
    setState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [key]: value
      }
    }));
  };

  const clearFilters = () => {
    setState(prev => ({
      ...prev,
      filters: {}
    }));
  };

  const formatTimestamp = (timestamp: Date | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleString();
  };

  const formatRssiRange = (min: number, max: number) => {
    if (min === max) return `${min} dBm`;
    return `${min} to ${max} dBm`;
  };

  const formatSnrRange = (min: number, max: number) => {
    if (min === max) return `${min.toFixed(1)} dB`;
    return `${min.toFixed(1)} to ${max.toFixed(1)} dB`;
  };

  const formatHopRange = (min: number, max: number) => {
    if (min === max) return `${min}`;
    return `${min}-${max}`;
  };

  return (
    <div className="packets-page">
      <div className="packets-header">
        <h1>Packets</h1>
        
        <div className="packets-controls">
          <label className="group-toggle">
            <input
              type="checkbox"
              checked={state.groupByPacketId}
              onChange={toggleGrouping}
            />
            <span>Group by Packet ID</span>
          </label>

          <button 
            className="filter-toggle-btn"
            onClick={toggleFilters}
          >
            {state.showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>

          {Object.keys(state.filters).length > 0 && (
            <button 
              className="clear-filters-btn"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {state.showFilters && (
        <div className="packets-filters">
          <div className="filter-section">
            <h3>Time Range (Requirement 38.5)</h3>
            <div className="filter-row">
              <label>
                Start Time:
                <input
                  type="datetime-local"
                  value={state.filters.startTime || ''}
                  onChange={(e) => updateFilter('startTime', e.target.value)}
                />
              </label>
              <label>
                End Time:
                <input
                  type="datetime-local"
                  value={state.filters.endTime || ''}
                  onChange={(e) => updateFilter('endTime', e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="filter-section">
            <h3>Node Filters (Requirement 38.6)</h3>
            <div className="filter-row">
              <label>
                From Node:
                <select
                  value={state.filters.fromNodeId || ''}
                  onChange={(e) => updateFilter('fromNodeId', e.target.value || undefined)}
                >
                  <option value="">All Nodes</option>
                  {state.nodes.map(node => (
                    <option key={node.id} value={node.id}>
                      {node.shortName} ({node.id})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                To Node:
                <select
                  value={state.filters.toNodeId || ''}
                  onChange={(e) => updateFilter('toNodeId', e.target.value || undefined)}
                >
                  <option value="">All Nodes</option>
                  {state.nodes.map(node => (
                    <option key={node.id} value={node.id}>
                      {node.shortName} ({node.id})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="filter-row">
              <label>
                Exclude From Node:
                <select
                  value={state.filters.excludeFromNodeId || ''}
                  onChange={(e) => updateFilter('excludeFromNodeId', e.target.value || undefined)}
                >
                  <option value="">None</option>
                  {state.nodes.map(node => (
                    <option key={node.id} value={node.id}>
                      {node.shortName} ({node.id})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Exclude To Node:
                <select
                  value={state.filters.excludeToNodeId || ''}
                  onChange={(e) => updateFilter('excludeToNodeId', e.target.value || undefined)}
                >
                  <option value="">None</option>
                  {state.nodes.map(node => (
                    <option key={node.id} value={node.id}>
                      {node.shortName} ({node.id})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="filter-section">
            <h3>Gateway & Protocol (Requirements 38.7, 38.8)</h3>
            <div className="filter-row">
              <label>
                Gateway:
                <select
                  value={state.filters.gatewayId || ''}
                  onChange={(e) => updateFilter('gatewayId', e.target.value || undefined)}
                >
                  <option value="">All Gateways</option>
                  {state.gateways.map(gateway => (
                    <option key={gateway.id} value={gateway.id}>
                      {gateway.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Port Number:
                <select
                  value={state.filters.portnum !== undefined ? state.filters.portnum : ''}
                  onChange={(e) => updateFilter('portnum', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                >
                  <option value="">All Protocols</option>
                  {PORT_NUMBERS.map(port => (
                    <option key={port.value} value={port.value}>
                      {port.label} ({port.value})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="filter-section">
            <h3>Hop Count & Channel (Requirements 38.9, 38.11)</h3>
            <div className="filter-row">
              <label>
                Hop Count:
                <select
                  value={state.filters.hopCount || 'any'}
                  onChange={(e) => updateFilter('hopCount', e.target.value as PacketFilters['hopCount'])}
                >
                  {HOP_COUNT_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Primary Channel:
                <select
                  value={state.filters.primaryChannel !== undefined ? state.filters.primaryChannel : ''}
                  onChange={(e) => updateFilter('primaryChannel', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                >
                  <option value="">All Channels</option>
                  {[0, 1, 2, 3, 4, 5, 6, 7].map(ch => (
                    <option key={ch} value={ch}>
                      Channel {ch}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="filter-section">
            <h3>Signal Quality (Requirement 38.10)</h3>
            <div className="filter-row">
              <label>
                RSSI Min (dBm):
                <input
                  type="number"
                  value={state.filters.rssiMin !== undefined ? state.filters.rssiMin : ''}
                  onChange={(e) => updateFilter('rssiMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="-120"
                />
              </label>
              <label>
                RSSI Max (dBm):
                <input
                  type="number"
                  value={state.filters.rssiMax !== undefined ? state.filters.rssiMax : ''}
                  onChange={(e) => updateFilter('rssiMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="-30"
                />
              </label>
            </div>
            <div className="filter-row">
              <label>
                SNR Min (dB):
                <input
                  type="number"
                  step="0.1"
                  value={state.filters.snrMin !== undefined ? state.filters.snrMin : ''}
                  onChange={(e) => updateFilter('snrMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="-20"
                />
              </label>
              <label>
                SNR Max (dB):
                <input
                  type="number"
                  step="0.1"
                  value={state.filters.snrMax !== undefined ? state.filters.snrMax : ''}
                  onChange={(e) => updateFilter('snrMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="20"
                />
              </label>
            </div>
          </div>

          <div className="filter-section">
            <h3>Additional Options (Requirement 38.12, 38.13)</h3>
            <div className="filter-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={state.filters.excludeGatewaySelfMessages || false}
                  onChange={(e) => updateFilter('excludeGatewaySelfMessages', e.target.checked || undefined)}
                />
                <span>Exclude gateway self messages</span>
              </label>
            </div>
            <div className="filter-row">
              <label>
                Search Message Content:
                <input
                  type="text"
                  value={state.filters.searchContent || ''}
                  onChange={(e) => updateFilter('searchContent', e.target.value || undefined)}
                  placeholder="Search in text messages..."
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {state.loading && (
        <div className="packets-loading">
          <div className="spinner"></div>
          <p>Loading packets...</p>
        </div>
      )}

      {state.error && (
        <div className="packets-error">
          <p>{state.error}</p>
        </div>
      )}

      {!state.loading && !state.error && state.groupByPacketId && (
        <div className="packets-table-container responsive-table">
          <table className="packets-table">
            <thead>
              <tr>
                <th>Packet ID</th>
                <th>From Node</th>
                <th>To Node</th>
                <th>Port</th>
                <th>Text Content</th>
                <th className="hide-mobile">Gateways</th>
                <th className="hide-mobile">RSSI Range</th>
                <th className="hide-mobile">SNR Range</th>
                <th className="hide-mobile">Hops</th>
                <th>Receptions</th>
                <th className="hide-mobile">Relay Nodes</th>
                <th>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {state.packets.length === 0 ? (
                <tr>
                  <td colSpan={12} className="no-data">
                    No packets found
                  </td>
                </tr>
              ) : (
                state.packets.map((packet, index) => {
                  const groupedPacket = packet as GroupedPacket;
                  const textContent = extractTextContent(groupedPacket);
                  return (
                    <tr key={`${groupedPacket.mesh_packet_id}-${index}`}>
                      <td className="packet-id">{groupedPacket.mesh_packet_id}</td>
                      <td>{groupedPacket.from_node_id}</td>
                      <td>{groupedPacket.to_node_id || 'Broadcast'}</td>
                      <td>
                        <span className="port-badge">
                          {groupedPacket.portnum_name}
                        </span>
                      </td>
                      <td className="text-content">
                        {textContent ? (
                          <span className="message-text" title={textContent}>
                            {textContent.length > 50 ? `${textContent.substring(0, 50)}...` : textContent}
                          </span>
                        ) : (
                          <span className="no-content">-</span>
                        )}
                      </td>
                      <td className="hide-mobile">
                        <span className="gateway-count" title={groupedPacket.gateway_list.join(', ')}>
                          {groupedPacket.gateway_count} gateway{groupedPacket.gateway_count !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="hide-mobile">{formatRssiRange(groupedPacket.rssi_min, groupedPacket.rssi_max)}</td>
                      <td className="hide-mobile">{formatSnrRange(groupedPacket.snr_min, groupedPacket.snr_max)}</td>
                      <td className="hide-mobile">{formatHopRange(groupedPacket.hop_count_min, groupedPacket.hop_count_max)}</td>
                      <td className="reception-count">{groupedPacket.reception_count}</td>
                      <td className="relay-nodes hide-mobile">
                        {groupedPacket.relay_nodes_formatted || '-'}
                      </td>
                      <td>{formatTimestamp(groupedPacket.last_seen)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {!state.loading && !state.error && !state.groupByPacketId && (
        <div className="packets-table-container responsive-table">
          <table className="packets-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>From Node</th>
                <th>To Node</th>
                <th>Type</th>
                <th>Text Content</th>
                <th className="hide-mobile">RSSI</th>
                <th className="hide-mobile">SNR</th>
                <th className="hide-mobile">Hops</th>
                <th className="hide-mobile">Gateway</th>
              </tr>
            </thead>
            <tbody>
              {state.packets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="no-data">
                    No packets found
                  </td>
                </tr>
              ) : (
                state.packets.map((packet, index) => {
                  const ungroupedPacket = packet as UngroupedPacket;
                  const textContent = extractTextContent(ungroupedPacket);
                  const hopCount = (ungroupedPacket.hopStart || 0) - (ungroupedPacket.hopLimit || 0);
                  const gatewayId = extractGatewayFromTopic(ungroupedPacket.topic);
                  
                  return (
                    <tr key={`${ungroupedPacket.id}-${index}`}>
                      <td>{formatTimestamp(ungroupedPacket.timestamp)}</td>
                      <td>
                        {ungroupedPacket.fromNode?.shortName || 
                         ungroupedPacket.fromNode?.longName || 
                         ungroupedPacket.fromNodeId}
                      </td>
                      <td>
                        {ungroupedPacket.toNode?.shortName || 
                         ungroupedPacket.toNode?.longName || 
                         ungroupedPacket.toNodeId || 
                         'Broadcast'}
                      </td>
                      <td>
                        <span className="port-badge">
                          {ungroupedPacket.type}
                        </span>
                      </td>
                      <td className="text-content">
                        {textContent ? (
                          <span className="message-text" title={textContent}>
                            {textContent.length > 50 ? `${textContent.substring(0, 50)}...` : textContent}
                          </span>
                        ) : (
                          <span className="no-content">-</span>
                        )}
                      </td>
                      <td className="hide-mobile">{ungroupedPacket.rssi ? `${ungroupedPacket.rssi} dBm` : '-'}</td>
                      <td className="hide-mobile">{ungroupedPacket.snr ? `${ungroupedPacket.snr.toFixed(1)} dB` : '-'}</td>
                      <td className="hide-mobile">{hopCount}</td>
                      <td className="hide-mobile">{gatewayId}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PacketsPage;
