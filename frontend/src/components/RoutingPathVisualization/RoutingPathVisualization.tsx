import React, { useEffect, useRef } from 'react';
import './RoutingPathVisualization.css';

interface Node {
  id: string;
  nodeId: string;
  shortName?: string;
  longName?: string;
  position?: {
    latitude: number;
    longitude: number;
  };
}

interface RoutingPathVisualizationProps {
  routingPath: string[];
  nodes: Node[];
  className?: string;
}

const RoutingPathVisualization: React.FC<RoutingPathVisualizationProps> = ({
  routingPath,
  nodes,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !routingPath.length || !nodes.length) return;

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const width = rect.width || 400;
    const height = rect.height || 200;

    // Clear previous content
    svg.innerHTML = '';

    // Create nodes map for quick lookup
    const nodeMap = new Map(nodes.map(node => [node.id, node]));

    // Filter routing path to only include nodes we have data for
    const validPath = routingPath.filter(nodeId => nodeMap.has(nodeId));

    if (validPath.length === 0) return;

    // Calculate positions for nodes along the path
    const nodePositions = validPath.map((nodeId, index) => {
      const node = nodeMap.get(nodeId)!;
      const x = (width / (validPath.length + 1)) * (index + 1);
      const y = height / 2;
      
      return {
        node,
        x,
        y,
        index
      };
    });

    // Create SVG elements
    const svgNS = 'http://www.w3.org/2000/svg';

    // Draw connections between nodes
    for (let i = 0; i < nodePositions.length - 1; i++) {
      const current = nodePositions[i];
      const next = nodePositions[i + 1];

      // Create arrow line
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', current.x.toString());
      line.setAttribute('y1', current.y.toString());
      line.setAttribute('x2', (next.x - 20).toString()); // Stop before the next node
      line.setAttribute('y2', next.y.toString());
      line.setAttribute('stroke', '#2196f3');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('marker-end', 'url(#arrowhead)');
      svg.appendChild(line);
    }

    // Create arrowhead marker
    const defs = document.createElementNS(svgNS, 'defs');
    const marker = document.createElementNS(svgNS, 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '7');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '3.5');
    marker.setAttribute('orient', 'auto');

    const polygon = document.createElementNS(svgNS, 'polygon');
    polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
    polygon.setAttribute('fill', '#2196f3');
    marker.appendChild(polygon);
    defs.appendChild(marker);
    svg.appendChild(defs);

    // Draw nodes
    nodePositions.forEach(({ node, x, y, index }) => {
      // Node circle
      const circle = document.createElementNS(svgNS, 'circle');
      circle.setAttribute('cx', x.toString());
      circle.setAttribute('cy', y.toString());
      circle.setAttribute('r', '15');
      circle.setAttribute('fill', index === 0 ? '#4caf50' : index === nodePositions.length - 1 ? '#f44336' : '#ff9800');
      circle.setAttribute('stroke', 'white');
      circle.setAttribute('stroke-width', '2');
      svg.appendChild(circle);

      // Node label
      const text = document.createElementNS(svgNS, 'text');
      text.setAttribute('x', x.toString());
      text.setAttribute('y', (y + 35).toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '12');
      text.setAttribute('font-family', 'Arial, sans-serif');
      text.setAttribute('fill', '#333');
      text.textContent = node.shortName || node.longName || node.nodeId.substring(0, 8);
      svg.appendChild(text);

      // Hop number
      const hopText = document.createElementNS(svgNS, 'text');
      hopText.setAttribute('x', x.toString());
      hopText.setAttribute('y', (y + 5).toString());
      hopText.setAttribute('text-anchor', 'middle');
      hopText.setAttribute('font-size', '10');
      hopText.setAttribute('font-family', 'Arial, sans-serif');
      hopText.setAttribute('font-weight', 'bold');
      hopText.setAttribute('fill', 'white');
      hopText.textContent = (index + 1).toString();
      svg.appendChild(hopText);
    });

  }, [routingPath, nodes]);

  if (!routingPath.length) {
    return (
      <div className={`routing-path-visualization ${className}`}>
        <div className="no-routing-path">
          Direct transmission (no routing path)
        </div>
      </div>
    );
  }

  return (
    <div className={`routing-path-visualization ${className}`}>
      <div className="routing-path-header">
        <h4>Message Routing Path</h4>
        <span className="hop-count">{routingPath.length} hops</span>
      </div>
      <svg
        ref={svgRef}
        className="routing-path-svg"
        viewBox="0 0 400 100"
        preserveAspectRatio="xMidYMid meet"
      />
      <div className="routing-path-legend">
        <div className="legend-item">
          <div className="legend-color source"></div>
          <span>Source</span>
        </div>
        <div className="legend-item">
          <div className="legend-color intermediate"></div>
          <span>Intermediate</span>
        </div>
        <div className="legend-item">
          <div className="legend-color destination"></div>
          <span>Destination</span>
        </div>
      </div>
    </div>
  );
};

export default RoutingPathVisualization;