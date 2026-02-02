/**
 * Hop Depth Selector Component
 * Provides UI for filtering nodes and links by hop depth
 * Requirements: 34.8, 34.9
 */

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import {
  setHopDepthFilter,
  setSelectedNodeForHopFilter,
  clearHopDepthFilter,
} from '../../store/slices/mapSlice';
import './HopDepthSelector.css';

const HopDepthSelector: React.FC = () => {
  const dispatch = useDispatch();
  const { hopDepthFilter, selectedNodeForHopFilter, showRFLinks } = useSelector(
    (state: RootState) => state.map
  );
  const { nodes } = useSelector((state: RootState) => state.nodes);

  // Only show if RF links are enabled
  if (!showRFLinks) {
    return null;
  }

  const handleHopDepthChange = (depth: number | null) => {
    dispatch(setHopDepthFilter(depth));
  };

  const handleNodeSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nodeId = event.target.value;
    dispatch(setSelectedNodeForHopFilter(nodeId || null));
  };

  const handleClear = () => {
    dispatch(clearHopDepthFilter());
  };

  // Get nodes with positions for the selector
  const nodesWithPositions = nodes.filter((node: any) => node.position);

  return (
    <div className="hop-depth-selector">
      <div className="hop-depth-selector-header">
        <h4>Hop Depth Filter</h4>
        {(hopDepthFilter !== null || selectedNodeForHopFilter) && (
          <button
            className="hop-depth-clear-btn"
            onClick={handleClear}
            title="Clear hop depth filter"
          >
            ✕
          </button>
        )}
      </div>

      <div className="hop-depth-selector-content">
        {/* Node selector */}
        <div className="hop-depth-control">
          <label htmlFor="hop-node-select">From Node:</label>
          <select
            id="hop-node-select"
            value={selectedNodeForHopFilter || ''}
            onChange={handleNodeSelect}
            className="hop-depth-node-select"
          >
            <option value="">Select a node...</option>
            {nodesWithPositions.map((node: any) => (
              <option key={node.id} value={node.id}>
                {node.shortName || node.longName || node.id}
              </option>
            ))}
          </select>
        </div>

        {/* Hop depth buttons */}
        {selectedNodeForHopFilter && (
          <div className="hop-depth-control">
            <label>Max Hops:</label>
            <div className="hop-depth-buttons">
              <button
                className={`hop-depth-btn ${hopDepthFilter === 1 ? 'active' : ''}`}
                onClick={() => handleHopDepthChange(1)}
                title="Show nodes within 1 hop"
              >
                1
              </button>
              <button
                className={`hop-depth-btn ${hopDepthFilter === 2 ? 'active' : ''}`}
                onClick={() => handleHopDepthChange(2)}
                title="Show nodes within 2 hops"
              >
                2
              </button>
              <button
                className={`hop-depth-btn ${hopDepthFilter === 3 ? 'active' : ''}`}
                onClick={() => handleHopDepthChange(3)}
                title="Show nodes within 3 hops"
              >
                3
              </button>
              <button
                className={`hop-depth-btn ${hopDepthFilter === null ? 'active' : ''}`}
                onClick={() => handleHopDepthChange(null)}
                title="Show all nodes"
              >
                All
              </button>
            </div>
          </div>
        )}

        {/* Info text */}
        {selectedNodeForHopFilter && hopDepthFilter !== null && (
          <div className="hop-depth-info">
            Showing nodes within {hopDepthFilter} hop{hopDepthFilter !== 1 ? 's' : ''} of{' '}
            {nodes.find((n: any) => n.id === selectedNodeForHopFilter)?.shortName ||
              selectedNodeForHopFilter}
          </div>
        )}
      </div>
    </div>
  );
};

export default HopDepthSelector;
