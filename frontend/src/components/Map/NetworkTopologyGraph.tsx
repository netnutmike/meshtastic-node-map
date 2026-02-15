import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { Node, NodeNeighbor } from '../../store/slices/nodeSlice';
import { Box, Paper, Typography, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel, CircularProgress } from '@mui/material';
import apiService from '../../services/api';

// D3.js types and imports (we'll use a simple implementation without D3 for now to avoid dependencies)
interface GraphNode {
  id: string;
  name: string;
  role: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  neighbors: NodeNeighbor[];
}

interface GraphLink {
  source: string;
  target: string;
  rssi?: number;
  snr?: number;
  hopCount: number;
  strength: number; // 0-1 normalized strength
  type: 'neighbor' | 'traceroute' | 'gateway';
}

interface NetworkTopologyGraphProps {
  isOpen: boolean;
  onClose: () => void;
}

const NetworkTopologyGraph: React.FC<NetworkTopologyGraphProps> = ({ isOpen, onClose }) => {
  const { nodes } = useSelector((state: RootState) => state.nodes);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [layoutType, setLayoutType] = useState<'force' | 'circular' | 'hierarchical'>('force');
  const [showLabels, setShowLabels] = useState(true);
  const [filterByRole, setFilterByRole] = useState<string>('all');
  const [minSignalStrength, setMinSignalStrength] = useState(-100);
  const [topologyLinks, setTopologyLinks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch topology links from API
  useEffect(() => {
    if (!isOpen) return;

    const fetchTopologyLinks = async () => {
      setIsLoading(true);
      try {
        const response = await apiService.getTopologyLinks({
          includeNeighbors: true,
          includeTraceroutes: true,
          minSnr: minSignalStrength > -120 ? minSignalStrength : undefined,
          maxAge: 24
        });
        
        // The API returns the data directly: { links: [...], count: N, filters: {...} }
        const links = (response as any).links || [];
        setTopologyLinks(links);
      } catch (error) {
        console.error('Failed to fetch topology links:', error);
        setTopologyLinks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopologyLinks();
  }, [isOpen, minSignalStrength]);

  // Process nodes and create graph data
  const graphData = React.useMemo(() => {
    const graphNodes: GraphNode[] = [];
    const graphLinks: GraphLink[] = [];
    const nodeMap = new Map<string, Node>();
    const seenNodeIds = new Set<string>();

    // Filter nodes based on criteria
    const filteredNodes = nodes.filter(node => {
      if (filterByRole !== 'all' && node.role !== filterByRole) return false;
      return true;
    });

    // Create node map for quick lookup
    filteredNodes.forEach(node => {
      const hexId = node.hexId.replace('!', '');
      nodeMap.set(hexId, node);
      seenNodeIds.add(hexId);
      graphNodes.push({
        id: hexId,
        name: node.shortName || node.longName || node.hexId,
        role: node.role,
        neighbors: node.neighbors || []
      });
    });

    // Process topology links from API and create placeholder nodes for any missing nodes
    topologyLinks.forEach(link => {
      const sourceId = link.source.replace('!', '');
      const targetId = link.target.replace('!', '');
      
      // Create placeholder nodes for any nodes that don't exist in the store
      if (!seenNodeIds.has(sourceId)) {
        seenNodeIds.add(sourceId);
        graphNodes.push({
          id: sourceId,
          name: link.metadata?.sourceName || sourceId,
          role: 'CLIENT', // Default role for unknown nodes
          neighbors: []
        });
      }
      
      if (!seenNodeIds.has(targetId)) {
        seenNodeIds.add(targetId);
        graphNodes.push({
          id: targetId,
          name: link.metadata?.targetName || targetId,
          role: 'CLIENT', // Default role for unknown nodes
          neighbors: []
        });
      }
      
      // Calculate normalized strength based on SNR or type
      let strength = 0.5;
      if (link.snr) {
        strength = Math.max(0, Math.min(1, (link.snr + 20) / 40)); // Map -20 to +20 dB to 0-1
      } else if (link.type === 'traceroute') {
        strength = 0.3; // Lower strength for traceroute links
      } else if (link.type === 'gateway') {
        strength = 0.4; // Medium strength for gateway links
      }
      
      graphLinks.push({
        source: sourceId,
        target: targetId,
        rssi: link.rssi,
        snr: link.snr,
        hopCount: link.hopIndex || 1,
        strength,
        type: link.type
      });
    });

    return { nodes: graphNodes, links: graphLinks };
  }, [nodes, filterByRole, topologyLinks]);

  // Simple canvas-based network visualization
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, width, height);

    if (graphData.nodes.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No nodes to display', width / 2, height / 2);
      return;
    }

    // Simple layout algorithms
    const layoutNodes = [...graphData.nodes];
    
    if (layoutType === 'circular') {
      // Circular layout
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.3;
      
      layoutNodes.forEach((node, i) => {
        const angle = (i / layoutNodes.length) * 2 * Math.PI;
        node.x = centerX + Math.cos(angle) * radius;
        node.y = centerY + Math.sin(angle) * radius;
      });
    } else if (layoutType === 'hierarchical') {
      // Simple hierarchical layout by role
      const roleGroups: { [key: string]: GraphNode[] } = {};
      layoutNodes.forEach(node => {
        if (!roleGroups[node.role]) roleGroups[node.role] = [];
        roleGroups[node.role].push(node);
      });

      const roles = Object.keys(roleGroups);
      const levelHeight = height / (roles.length + 1);
      
      roles.forEach((role, roleIndex) => {
        const nodesInRole = roleGroups[role];
        const nodeWidth = width / (nodesInRole.length + 1);
        
        nodesInRole.forEach((node, nodeIndex) => {
          node.x = nodeWidth * (nodeIndex + 1);
          node.y = levelHeight * (roleIndex + 1);
        });
      });
    } else {
      // Simple force-directed layout (basic implementation)
      layoutNodes.forEach((node, i) => {
        if (!node.x || !node.y) {
          node.x = Math.random() * width;
          node.y = Math.random() * height;
        }
      });

      // Simple force simulation (very basic)
      for (let iteration = 0; iteration < 50; iteration++) {
        // Repulsion between nodes
        for (let i = 0; i < layoutNodes.length; i++) {
          for (let j = i + 1; j < layoutNodes.length; j++) {
            const nodeA = layoutNodes[i];
            const nodeB = layoutNodes[j];
            const dx = nodeB.x! - nodeA.x!;
            const dy = nodeB.y! - nodeA.y!;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0 && distance < 100) {
              const force = 50 / (distance * distance);
              const fx = (dx / distance) * force;
              const fy = (dy / distance) * force;
              
              nodeA.x! -= fx;
              nodeA.y! -= fy;
              nodeB.x! += fx;
              nodeB.y! += fy;
            }
          }
        }

        // Attraction along links
        graphData.links.forEach(link => {
          const sourceNode = layoutNodes.find(n => n.id === link.source);
          const targetNode = layoutNodes.find(n => n.id === link.target);
          
          if (sourceNode && targetNode) {
            const dx = targetNode.x! - sourceNode.x!;
            const dy = targetNode.y! - sourceNode.y!;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
              const force = (distance - 80) * 0.01 * link.strength;
              const fx = (dx / distance) * force;
              const fy = (dy / distance) * force;
              
              sourceNode.x! += fx;
              sourceNode.y! += fy;
              targetNode.x! -= fx;
              targetNode.y! -= fy;
            }
          }
        });

        // Keep nodes within bounds
        layoutNodes.forEach(node => {
          node.x = Math.max(20, Math.min(width - 20, node.x!));
          node.y = Math.max(20, Math.min(height - 20, node.y!));
        });
      }
    }

    // Draw links
    graphData.links.forEach(link => {
      const sourceNode = layoutNodes.find(n => n.id === link.source);
      const targetNode = layoutNodes.find(n => n.id === link.target);
      
      if (sourceNode && targetNode) {
        ctx.beginPath();
        ctx.moveTo(sourceNode.x!, sourceNode.y!);
        ctx.lineTo(targetNode.x!, targetNode.y!);
        
        // Color and style based on link type and signal strength
        const alpha = Math.max(0.3, link.strength);
        
        if (link.type === 'traceroute') {
          // Traceroute links are dashed and purple
          ctx.setLineDash([5, 5]);
          ctx.strokeStyle = `rgba(156, 39, 176, ${alpha})`; // Purple
          ctx.lineWidth = 2;
        } else if (link.type === 'gateway') {
          // Gateway links are dotted and blue
          ctx.setLineDash([2, 4]);
          ctx.strokeStyle = `rgba(33, 150, 243, ${alpha})`; // Blue
          ctx.lineWidth = 2;
        } else {
          // Neighbor links are solid and colored by signal strength
          ctx.setLineDash([]);
          if (link.rssi && link.rssi >= -50) {
            ctx.strokeStyle = `rgba(76, 175, 80, ${alpha})`; // Green - strong
          } else if (link.rssi && link.rssi >= -70) {
            ctx.strokeStyle = `rgba(139, 195, 74, ${alpha})`; // Light green - good
          } else if (link.rssi && link.rssi >= -85) {
            ctx.strokeStyle = `rgba(255, 235, 59, ${alpha})`; // Yellow - fair
          } else if (link.rssi && link.rssi >= -100) {
            ctx.strokeStyle = `rgba(255, 152, 0, ${alpha})`; // Orange - poor
          } else {
            ctx.strokeStyle = `rgba(244, 67, 54, ${alpha})`; // Red - very poor
          }
          ctx.lineWidth = Math.max(1, link.strength * 4);
        }
        
        ctx.stroke();
        ctx.setLineDash([]); // Reset dash

        // Draw arrow head for directed links
        const angle = Math.atan2(targetNode.y! - sourceNode.y!, targetNode.x! - sourceNode.x!);
        const arrowLength = 10;
        const arrowAngle = Math.PI / 6;
        
        ctx.beginPath();
        ctx.moveTo(
          targetNode.x! - arrowLength * Math.cos(angle - arrowAngle),
          targetNode.y! - arrowLength * Math.sin(angle - arrowAngle)
        );
        ctx.lineTo(targetNode.x!, targetNode.y!);
        ctx.lineTo(
          targetNode.x! - arrowLength * Math.cos(angle + arrowAngle),
          targetNode.y! - arrowLength * Math.sin(angle + arrowAngle)
        );
        ctx.stroke();
      }
    });

    // Draw nodes
    layoutNodes.forEach(node => {
      // Node circle
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, 8, 0, 2 * Math.PI);
      
      // Color by role
      switch (node.role) {
        case 'ROUTER':
          ctx.fillStyle = '#2196f3'; // Blue
          break;
        case 'CLIENT':
          ctx.fillStyle = '#4caf50'; // Green
          break;
        case 'REPEATER':
          ctx.fillStyle = '#ff9800'; // Orange
          break;
        default:
          ctx.fillStyle = '#9e9e9e'; // Gray
      }
      
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Node label
      if (showLabels) {
        // Use theme-aware color for labels
        const isDarkMode = document.documentElement.getAttribute('data-bs-theme') === 'dark';
        ctx.fillStyle = isDarkMode ? '#f0f0f0' : '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(node.name, node.x!, node.y! + 20);
      }
    });

  }, [graphData, layoutType, showLabels, isOpen]);

  if (!isOpen) return null;

  const uniqueRoles = Array.from(new Set(nodes.map(node => node.role)));

  return (
    <Paper
      sx={{
        position: 'fixed',
        top: '10%',
        left: '10%',
        width: '80%',
        height: '80%',
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Network Topology Graph</Typography>
        <Box
          component="button"
          onClick={onClose}
          sx={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '0 8px',
            color: 'text.primary',
            '&:hover': {
              color: 'text.secondary'
            }
          }}
        >
          ×
        </Box>
      </Box>

      {/* Controls */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Layout</InputLabel>
          <Select
            value={layoutType}
            label="Layout"
            onChange={(e) => setLayoutType(e.target.value as any)}
          >
            <MenuItem value="force">Force Directed</MenuItem>
            <MenuItem value="circular">Circular</MenuItem>
            <MenuItem value="hierarchical">Hierarchical</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Filter by Role</InputLabel>
          <Select
            value={filterByRole}
            label="Filter by Role"
            onChange={(e) => setFilterByRole(e.target.value)}
          >
            <MenuItem value="all">All Roles</MenuItem>
            {uniqueRoles.map(role => (
              <MenuItem key={role} value={role}>{role}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Min Signal (dBm)</InputLabel>
          <Select
            value={minSignalStrength}
            label="Min Signal (dBm)"
            onChange={(e) => setMinSignalStrength(e.target.value as number)}
          >
            <MenuItem value={-120}>-120 dBm (All)</MenuItem>
            <MenuItem value={-100}>-100 dBm (Poor+)</MenuItem>
            <MenuItem value={-85}>-85 dBm (Fair+)</MenuItem>
            <MenuItem value={-70}>-70 dBm (Good+)</MenuItem>
            <MenuItem value={-50}>-50 dBm (Excellent)</MenuItem>
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Switch
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
            />
          }
          label="Labels"
        />

        {isLoading && <CircularProgress size={24} />}
      </Box>

      {/* Graph Canvas */}
      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          style={{
            width: '100%',
            height: '100%',
            cursor: 'grab'
          }}
        />
      </Box>

      {/* Legend */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" gutterBottom>Legend:</Typography>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', fontSize: '12px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#2196f3' }} />
            <span>Router</span>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#4caf50' }} />
            <span>Client</span>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#ff9800' }} />
            <span>Repeater</span>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 3, bgcolor: '#4caf50' }} />
            <span>Strong Signal (-50+ dBm)</span>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 3, bgcolor: '#ffeb3b' }} />
            <span>Fair Signal (-85+ dBm)</span>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 3, bgcolor: '#f44336' }} />
            <span>Poor Signal (-100+ dBm)</span>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 3, bgcolor: '#9c27b0', borderTop: '2px dashed #9c27b0' }} />
            <span>Traceroute Path</span>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 3, bgcolor: '#2196f3', borderTop: '2px dotted #2196f3' }} />
            <span>Gateway Link</span>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default NetworkTopologyGraph;