import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import RoutingPathVisualization from '../RoutingPathVisualization';
import './MessageHistory.css';

interface Message {
  id: string;
  messageId?: string;
  type: string;
  content: any;
  encrypted: boolean;
  channel: number;
  timestamp: string;
  receivedAt: string;
  routingPath: string[];
  rssi?: number;
  snr?: number;
  fromNode: {
    id: string;
    nodeId: string;
    shortName?: string;
    longName?: string;
    role: string;
  };
  toNode?: {
    id: string;
    nodeId: string;
    shortName?: string;
    longName?: string;
    role: string;
  };
}

interface MessageHistoryProps {
  nodeId: string;
  direction: 'sent' | 'received' | 'gated';
}

const MessageHistory: React.FC<MessageHistoryProps> = ({ nodeId, direction }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allNodes, setAllNodes] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    type: '',
    search: '',
    startDate: '',
    endDate: '',
    encrypted: undefined as boolean | undefined,
    channel: undefined as number | undefined
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);

  const fetchAllNodes = async () => {
    try {
      const response = await apiService.getNodes();
      setAllNodes(response.data || []);
    } catch (err) {
      console.error('Failed to fetch nodes:', err);
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    setError(null);

    try {
      let response: any;
      
      if (direction === 'gated') {
        // For gated messages, we look for messages that have routing paths
        response = await apiService.getMessages({
          page: pagination.page,
          limit: pagination.limit,
          ...filters,
          // Gated messages are those that were routed through this node
          // This is a simplified implementation - in reality, we'd need more complex logic
        });
      } else {
        // Map direction to API parameter
        const apiDirection = direction === 'sent' ? 'sent' : 'received';
        response = await apiService.getNodeMessages(nodeId, apiDirection, {
          page: pagination.page,
          limit: pagination.limit,
          ...filters
        });
      }

      setMessages(response.data || []);
      if (response.pagination) {
        setPagination(prev => ({
          ...prev,
          total: response.pagination!.total,
          pages: response.pagination!.pages
        }));
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setError('Failed to load messages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchAllNodes();
  }, [nodeId, direction, filters, pagination.page, fetchMessages]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const exportOptions = {
        ...filters,
        ...(direction === 'sent' ? { fromNodeId: nodeId } : 
           direction === 'received' ? { toNodeId: nodeId } : {})
      };

      const blob = await apiService.exportMessages(format, exportOptions);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `messages_${direction}_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      setError('Export failed. Please try again.');
    }
  };

  const formatMessageContent = (content: any, type: string): string => {
    if (typeof content === 'string') {
      return content;
    }
    
    if (type === 'POSITION') {
      return `Position: ${content.latitude?.toFixed(6)}, ${content.longitude?.toFixed(6)}`;
    }
    
    if (type === 'TELEMETRY') {
      return `Telemetry: ${Object.keys(content).join(', ')}`;
    }
    
    return JSON.stringify(content, null, 2);
  };

  const formatRoutingPath = (path: string[]): string => {
    if (!path || path.length === 0) return 'Direct';
    return path.join(' → ');
  };

  const getMessageTypeColor = (type: string): string => {
    const colors: { [key: string]: string } = {
      'TEXT': '#4caf50',
      'POSITION': '#2196f3',
      'TELEMETRY': '#ff9800',
      'NODEINFO': '#9c27b0',
      'ROUTING': '#607d8b',
      'ADMIN': '#f44336'
    };
    return colors[type] || '#757575';
  };

  const renderMessage = (message: Message) => {
    const isExpanded = expandedMessage === message.id;
    const displayName = direction === 'sent' 
      ? (message.toNode?.shortName || message.toNode?.longName || 'Broadcast')
      : (message.fromNode?.shortName || message.fromNode?.longName || 'Unknown');

    return (
      <div key={message.id} className="message-item">
        <div className="message-header" onClick={() => setExpandedMessage(isExpanded ? null : message.id)}>
          <div className="message-info">
            <span 
              className="message-type"
              style={{ backgroundColor: getMessageTypeColor(message.type) }}
            >
              {message.type}
            </span>
            <span className="message-peer">{displayName}</span>
            <span className="message-time">
              {new Date(message.timestamp).toLocaleString()}
            </span>
            {message.encrypted && <span className="encrypted-badge">🔒</span>}
          </div>
          <div className="message-preview">
            {formatMessageContent(message.content, message.type).substring(0, 100)}
            {formatMessageContent(message.content, message.type).length > 100 && '...'}
          </div>
        </div>
        
        {isExpanded && (
          <div className="message-details">
            <div className="message-content">
              <h4>Content:</h4>
              <pre>{formatMessageContent(message.content, message.type)}</pre>
            </div>
            
            <div className="message-metadata">
              <div className="metadata-row">
                <label>Message ID:</label>
                <span>{message.messageId || 'N/A'}</span>
              </div>
              <div className="metadata-row">
                <label>Channel:</label>
                <span>{message.channel}</span>
              </div>
              <div className="metadata-row">
                <label>Encrypted:</label>
                <span>{message.encrypted ? 'Yes' : 'No'}</span>
              </div>
              <div className="metadata-row">
                <label>Routing Path:</label>
                <span>{formatRoutingPath(message.routingPath)}</span>
              </div>
              {message.rssi && (
                <div className="metadata-row">
                  <label>RSSI:</label>
                  <span>{message.rssi} dBm</span>
                </div>
              )}
              {message.snr && (
                <div className="metadata-row">
                  <label>SNR:</label>
                  <span>{message.snr} dB</span>
                </div>
              )}
              <div className="metadata-row">
                <label>Received At:</label>
                <span>{new Date(message.receivedAt).toLocaleString()}</span>
              </div>
            </div>
            
            {message.routingPath && message.routingPath.length > 0 && (
              <RoutingPathVisualization
                routingPath={message.routingPath}
                nodes={allNodes}
                className="message-routing-path"
              />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="message-history">
      <div className="message-filters">
        <div className="filter-row">
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="filter-select"
          >
            <option value="">All Types</option>
            <option value="TEXT">Text</option>
            <option value="POSITION">Position</option>
            <option value="TELEMETRY">Telemetry</option>
            <option value="NODEINFO">Node Info</option>
            <option value="ROUTING">Routing</option>
            <option value="ADMIN">Admin</option>
          </select>

          <input
            type="text"
            placeholder="Search content..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="filter-input"
          />

          <select
            value={filters.encrypted?.toString() || ''}
            onChange={(e) => handleFilterChange('encrypted', e.target.value === '' ? undefined : e.target.value === 'true')}
            className="filter-select"
          >
            <option value="">All Messages</option>
            <option value="true">Encrypted Only</option>
            <option value="false">Unencrypted Only</option>
          </select>
        </div>

        <div className="filter-row">
          <input
            type="datetime-local"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            className="filter-input"
            placeholder="Start Date"
          />

          <input
            type="datetime-local"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            className="filter-input"
            placeholder="End Date"
          />

          <input
            type="number"
            min="0"
            max="7"
            placeholder="Channel"
            value={filters.channel || ''}
            onChange={(e) => handleFilterChange('channel', e.target.value ? parseInt(e.target.value) : undefined)}
            className="filter-input"
          />
        </div>

        <div className="filter-actions">
          <button onClick={() => handleExport('csv')} className="export-btn">
            Export CSV
          </button>
          <button onClick={() => handleExport('json')} className="export-btn">
            Export JSON
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading-message">
          Loading messages...
        </div>
      ) : (
        <>
          <div className="message-list">
            {messages.length === 0 ? (
              <div className="no-messages">
                No {direction} messages found for this node.
              </div>
            ) : (
              messages.map(renderMessage)
            )}
          </div>

          {pagination.pages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page === 1}
                className="pagination-btn"
              >
                Previous
              </button>
              
              <span className="pagination-info">
                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
              </span>
              
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                disabled={pagination.page === pagination.pages}
                className="pagination-btn"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MessageHistory;