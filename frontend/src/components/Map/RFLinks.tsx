/**
 * RF Links Component
 * Renders RF links on the map from traceroute and packet data
 * Requirements: 34.4, 34.5, 34.6, 34.7, 34.8, 34.9, 39.10, 39.11, 40.9
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import { useSelector } from 'react-redux';
import L from 'leaflet';
import { RootState } from '../../store';
import { apiService } from '../../services/api';
import {
  computeNodesWithinHops,
  filterLinksByVisibleNodes,
} from '../../utils/hopDepthCalculation';
import { calculateDistance, formatDistance } from '../../utils/distanceCalculation';
import './RFLinks.css';

interface RFLink {
  from_node_id: string;
  to_node_id: string;
  link_type: 'traceroute' | 'packet';
  packet_count: number;
  avg_rssi: number;
  avg_snr: number;
  last_seen: Date;
  success_rate: number;
  is_bidirectional: boolean;
}

interface RFLinksResponse {
  traceroute_links: RFLink[];
  packet_links: RFLink[];
  all_links: RFLink[];
}

/**
 * Get link color based on success rate
 * Green (>=80%), Yellow (50-79%), Red (<50%)
 */
const getLinkColor = (successRate: number): string => {
  if (successRate >= 80) return '#28a745'; // Green
  if (successRate >= 50) return '#ffc107'; // Yellow
  return '#dc3545'; // Red
};

/**
 * Get link style based on link type
 * Solid for traceroute, dashed for packet
 */
const getLinkStyle = (linkType: 'traceroute' | 'packet') => {
  if (linkType === 'traceroute') {
    return {
      dashArray: undefined, // Solid line
      weight: 2,
      opacity: 0.6,
    };
  } else {
    return {
      dashArray: '3, 6', // Dashed line
      weight: 2,
      opacity: 0.6,
    };
  }
};

const RFLinks: React.FC = () => {
  const map = useMap();
  const {
    showRFLinks,
    showTracerouteLinks,
    showPacketLinks,
    showDistanceLabels,
    hopDepthFilter,
    selectedNodeForHopFilter,
  } = useSelector((state: RootState) => state.map);
  const { nodes } = useSelector((state: RootState) => state.nodes);
  
  const [links, setLinks] = useState<RFLink[]>([]);
  const [linkLayers, setLinkLayers] = useState<L.Polyline[]>([]);
  const [labelLayers, setLabelLayers] = useState<L.Tooltip[]>([]);

  // Fetch RF links from API
  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const response = await apiService.getRFLinks({ hours: 24 });
        
        if (response.data) {
          setLinks(response.data.all_links);
        }
      } catch (error) {
        console.error('Failed to fetch RF links:', error);
      }
    };

    if (showRFLinks) {
      fetchLinks();
      // Refresh links every 5 minutes
      const interval = setInterval(fetchLinks, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [showRFLinks]);

  // Compute visible nodes based on hop depth filter
  const visibleNodeIds = useMemo(() => {
    if (!selectedNodeForHopFilter || hopDepthFilter === null) {
      // No filter active - all nodes are visible
      return null;
    }

    // Compute nodes within hop depth
    return computeNodesWithinHops(selectedNodeForHopFilter, hopDepthFilter, links);
  }, [selectedNodeForHopFilter, hopDepthFilter, links]);

  // Filter links based on visible nodes
  const filteredLinks = useMemo(() => {
    if (!visibleNodeIds) {
      return links;
    }

    return filterLinksByVisibleNodes(links, visibleNodeIds);
  }, [links, visibleNodeIds]);

  // Render links on map
  useEffect(() => {
    // Clear existing link layers
    linkLayers.forEach(layer => map.removeLayer(layer));
    
    // Clear existing label layers
    labelLayers.forEach(layer => map.removeLayer(layer));

    if (!showRFLinks || filteredLinks.length === 0) {
      setLinkLayers([]);
      setLabelLayers([]);
      return;
    }

    const newLinkLayers: L.Polyline[] = [];
    const newLabelLayers: L.Tooltip[] = [];

    filteredLinks.forEach(link => {
      // Filter by link type toggles
      if (link.link_type === 'traceroute' && !showTracerouteLinks) return;
      if (link.link_type === 'packet' && !showPacketLinks) return;

      // Find node positions
      const fromNode = nodes.find((n: any) => n.id === link.from_node_id);
      const toNode = nodes.find((n: any) => n.id === link.to_node_id);

      if (!fromNode?.position || !toNode?.position) {
        return; // Skip if nodes don't have positions
      }

      // If hop depth filter is active, only show nodes in the visible set
      if (visibleNodeIds) {
        if (!visibleNodeIds.has(link.from_node_id) || !visibleNodeIds.has(link.to_node_id)) {
          return;
        }
      }

      const fromLatLng: L.LatLngExpression = [
        fromNode.position.latitude,
        fromNode.position.longitude
      ];
      const toLatLng: L.LatLngExpression = [
        toNode.position.latitude,
        toNode.position.longitude
      ];

      // Calculate distance
      const distance = calculateDistance(
        fromNode.position.latitude,
        fromNode.position.longitude,
        toNode.position.latitude,
        toNode.position.longitude
      );
      const distanceFormatted = formatDistance(distance);

      // Get link style and color
      const style = getLinkStyle(link.link_type);
      const color = getLinkColor(link.success_rate);

      // Create polyline
      const polyline = L.polyline([fromLatLng, toLatLng], {
        color,
        ...style,
      });

      // Create popup content with distance and Line of Sight button
      const popupContent = `
        <div style="font-family: Arial, sans-serif; min-width: 200px;">
          <h4 style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold;">
            RF Link
          </h4>
          <div style="font-size: 12px;">
            <div style="margin-bottom: 5px;">
              <strong>From:</strong> ${fromNode.shortName || fromNode.id}
            </div>
            <div style="margin-bottom: 5px;">
              <strong>To:</strong> ${toNode.shortName || toNode.id}
            </div>
            <div style="margin-bottom: 5px;">
              <strong>Distance:</strong> ${distanceFormatted}
            </div>
            <div style="margin-bottom: 5px;">
              <strong>Type:</strong> ${link.link_type === 'traceroute' ? 'Traceroute' : 'Packet (0-hop)'}
            </div>
            <div style="margin-bottom: 5px;">
              <strong>Success Rate:</strong> ${link.success_rate}%
            </div>
            <div style="margin-bottom: 5px;">
              <strong>Total Attempts:</strong> ${link.packet_count}
            </div>
            <div style="margin-bottom: 5px;">
              <strong>Avg RSSI:</strong> ${link.avg_rssi.toFixed(1)} dBm
            </div>
            <div style="margin-bottom: 5px;">
              <strong>Avg SNR:</strong> ${link.avg_snr.toFixed(1)} dB
            </div>
            <div style="margin-bottom: 5px;">
              <strong>Last Seen:</strong> ${new Date(link.last_seen).toLocaleString()}
            </div>
            ${link.is_bidirectional ? '<div style="margin-top: 5px; color: #28a745;"><strong>↔ Bidirectional</strong></div>' : ''}
          </div>
          <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
            <a 
              href="/line-of-sight?from=${link.from_node_id}&to=${link.to_node_id}"
              style="
                display: inline-block;
                padding: 6px 12px;
                background-color: #1976d2;
                color: white;
                text-decoration: none;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
                text-align: center;
                width: 100%;
                box-sizing: border-box;
              "
              onmouseover="this.style.backgroundColor='#1565c0'"
              onmouseout="this.style.backgroundColor='#1976d2'"
            >
              📡 Line of Sight Analysis
            </a>
          </div>
        </div>
      `;

      polyline.bindPopup(popupContent);

      // Add to map
      polyline.addTo(map);
      newLinkLayers.push(polyline);

      // Add distance label if enabled
      if (showDistanceLabels) {
        // Calculate midpoint for label placement
        const midLat = (fromNode.position.latitude + toNode.position.latitude) / 2;
        const midLon = (fromNode.position.longitude + toNode.position.longitude) / 2;
        const midPoint: L.LatLngExpression = [midLat, midLon];

        // Create tooltip for distance label
        const tooltip = L.tooltip({
          permanent: true,
          direction: 'center',
          className: 'distance-label',
          opacity: 0.9,
        })
          .setLatLng(midPoint)
          .setContent(distanceFormatted);

        tooltip.addTo(map);
        newLabelLayers.push(tooltip);
      }
    });

    setLinkLayers(newLinkLayers);
    setLabelLayers(newLabelLayers);

    // Cleanup function
    return () => {
      newLinkLayers.forEach(layer => map.removeLayer(layer));
      newLabelLayers.forEach(layer => map.removeLayer(layer));
    };
  }, [
    showRFLinks,
    showTracerouteLinks,
    showPacketLinks,
    showDistanceLabels,
    filteredLinks,
    nodes,
    map,
    visibleNodeIds,
  ]);

  return null; // This component doesn't render anything directly
};

export default RFLinks;
