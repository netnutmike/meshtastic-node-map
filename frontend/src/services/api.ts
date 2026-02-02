// API service for making HTTP requests to the backend

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

export interface SearchFilters {
  search?: string;
  hardwareModel?: string;
  role?: string;
  isOnline?: boolean;
  mqttConnected?: boolean;
  minBattery?: number;
  maxAge?: number;
  startDate?: Date;
  endDate?: Date;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface ApiResponse<T> {
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // Ensure endpoint starts with /v1 if it doesn't already
    const normalizedEndpoint = endpoint.startsWith('/v1/') ? endpoint : `/v1${endpoint}`;
    const url = `${API_BASE_URL}${normalizedEndpoint}`;
    
    // Get auth token if available (optional)
    const token = localStorage.getItem('authToken');
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Helper method to build query parameters from filters
  private buildQueryParams(filters: SearchFilters): URLSearchParams {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (key === 'startDate' || key === 'endDate') {
          params.append(key, (value as Date).toISOString());
        } else if (key === 'bounds') {
          params.append(key, JSON.stringify(value));
        } else {
          params.append(key, String(value));
        }
      }
    });
    
    return params;
  }

  // Telemetry API methods
  async getTelemetryLatest(nodeId: string, type?: string): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    
    const endpoint = `/telemetry/latest/${nodeId}${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request<any[]>(endpoint);
  }

  async getTelemetryStats(
    nodeId: string, 
    options: {
      type?: string;
      startDate?: string;
      endDate?: string;
      interval?: 'hour' | 'day' | 'week' | 'month';
    } = {}
  ): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    
    const endpoint = `/telemetry/stats/${nodeId}${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request<any[]>(endpoint);
  }

  async getTelemetry(
    options: {
      nodeId?: string;
      type?: string;
      networkId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });
    
    const endpoint = `/telemetry${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request<any[]>(endpoint);
  }

  // Node API methods
  async getNodes(filters?: SearchFilters): Promise<ApiResponse<any[]>> {
    if (filters && Object.keys(filters).length > 0) {
      const params = this.buildQueryParams(filters);
      return this.request<any[]>(`/nodes?${params.toString()}`);
    }
    return this.request<any[]>('/nodes');
  }

  async searchNodes(filters: SearchFilters): Promise<ApiResponse<any[]>> {
    const params = this.buildQueryParams(filters);
    return this.request<any[]>(`/nodes?${params.toString()}`);
  }

  async getNode(nodeId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/nodes/${nodeId}`);
  }

  async getNodePositions(nodeId: string, params?: any): Promise<ApiResponse<any[]>> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request<any[]>(`/nodes/${nodeId}/positions${queryString}`);
  }

  async getNodeNeighbors(nodeId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/nodes/${nodeId}/neighbors`);
  }

  // Message API methods
  async getMessages(
    options: {
      fromNodeId?: string;
      toNodeId?: string;
      type?: string;
      encrypted?: boolean;
      channel?: number;
      networkId?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = `/messages${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request<any[]>(endpoint);
  }

  async getMessage(messageId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/messages/${messageId}`);
  }

  async getNodeMessages(
    nodeId: string,
    direction: 'sent' | 'received' | 'both' = 'both',
    options: {
      type?: string;
      limit?: number;
      page?: number;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    
    // Add direction parameter
    params.append('direction', direction);
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = `/messages/node/${nodeId}${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request<any[]>(endpoint);
  }

  async getConversation(
    nodeId1: string,
    nodeId2: string,
    options: {
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = `/messages/conversation/${nodeId1}/${nodeId2}${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request<any[]>(endpoint);
  }

  async exportMessages(
    format: 'csv' | 'json',
    options: {
      fromNodeId?: string;
      toNodeId?: string;
      type?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('format', format);
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const url = `${API_BASE_URL}/v1/messages/export?${params.toString()}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': format === 'csv' ? 'text/csv' : 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }
    
    return response.blob();
  }

  // Statistics API methods
  async getNetworkStatistics(
    options: {
      networkId?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = `/statistics/network${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request<any>(endpoint);
  }

  async getNodeTypeDistribution(networkId?: string): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (networkId) params.append('networkId', networkId);
    
    const endpoint = `/statistics/nodes/distribution${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request<any[]>(endpoint);
  }

  async getMessageAnalytics(
    options: {
      networkId?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = `/statistics/messages${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request<any>(endpoint);
  }

  async getUtilizationReport(networkId?: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (networkId) params.append('networkId', networkId);
    
    const endpoint = `/statistics/utilization${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request<any>(endpoint);
  }

  // Utilization Analysis API methods
  async getChannelUtilizationStats(networkId?: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (networkId) params.append('networkId', networkId);
    
    const endpoint = `/utilization-analysis/channel-stats${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request<any>(endpoint);
  }

  async getUtilizationTrends(period: '24h' | '7d' | '30d' = '24h'): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    params.append('period', period);
    
    const endpoint = `/utilization-analysis/trends?${params.toString()}`;
    return this.request<any>(endpoint);
  }

  async getUtilizationHeatmap(networkId?: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (networkId) params.append('networkId', networkId);
    
    const endpoint = `/utilization-analysis/heatmap${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request<any>(endpoint);
  }

  async getCapacityPlanningReport(networkId?: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (networkId) params.append('networkId', networkId);
    
    const endpoint = `/utilization-analysis/capacity-planning${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request<any>(endpoint);
  }

  async getHighUtilizationNodes(threshold: number = 80, networkId?: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    params.append('threshold', threshold.toString());
    if (networkId) params.append('networkId', networkId);
    
    const endpoint = `/utilization-analysis/high-utilization-nodes?${params.toString()}`;
    return this.request<any>(endpoint);
  }

  async getNetworkCapacityMetrics(networkId?: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (networkId) params.append('networkId', networkId);
    
    const endpoint = `/utilization-analysis/capacity-metrics${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request<any>(endpoint);
  }

  async getTrendAnalysis(period: '7d' | '30d' = '7d'): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    params.append('period', period);
    
    const endpoint = `/utilization-analysis/trend-analysis?${params.toString()}`;
    return this.request<any>(endpoint);
  }

  async getUtilizationAnomalies(networkId?: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (networkId) params.append('networkId', networkId);
    
    const endpoint = `/utilization-analysis/anomalies${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request<any>(endpoint);
  }

  async getUtilizationForecast(daysAhead: number = 7): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    params.append('daysAhead', daysAhead.toString());
    
    const endpoint = `/utilization-analysis/forecast?${params.toString()}`;
    return this.request<any>(endpoint);
  }

  async checkUtilizationThresholds(config: { warning: number; critical: number; checkInterval?: number }): Promise<ApiResponse<any>> {
    const endpoint = '/utilization-analysis/check-thresholds';
    return this.request<any>(endpoint, {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  async getPerformanceDegradation(): Promise<ApiResponse<any>> {
    const endpoint = '/utilization-analysis/performance-degradation';
    return this.request<any>(endpoint);
  }

  async post<T = any>(endpoint: string, data?: any, options: RequestInit = {}): Promise<{ data: T }> {
    const response = await this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...options
    });
    return response;
  }

  async put<T = any>(endpoint: string, data?: any, options: RequestInit = {}): Promise<{ data: T }> {
    const response = await this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...options
    });
    return response;
  }

  async delete<T = any>(endpoint: string, options: RequestInit = {}): Promise<{ data: T }> {
    const response = await this.request<T>(endpoint, {
      method: 'DELETE',
      ...options
    });
    return response;
  }

  // Multi-Network API methods
  async getMultiNetworkStatus(): Promise<ApiResponse<any>> {
    return this.request<any>('/multi-network/status');
  }

  async getAvailableNetworks(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/multi-network/networks');
  }

  async connectToNetwork(networkId: string, accessControls?: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/multi-network/networks/${networkId}/connect`, {
      method: 'POST',
      body: JSON.stringify(accessControls || {})
    });
  }

  async disconnectFromNetwork(networkId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/multi-network/networks/${networkId}/disconnect`, {
      method: 'DELETE'
    });
  }

  async updateNetworkAccessControls(networkId: string, accessControls: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/multi-network/networks/${networkId}/access-controls`, {
      method: 'PUT',
      body: JSON.stringify(accessControls)
    });
  }

  async getCrossNetworkAnalytics(options: {
    startDate?: string;
    endDate?: string;
  } = {}): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = `/multi-network/analytics${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request<any>(endpoint);
  }

  async getFederationStatus(): Promise<ApiResponse<any>> {
    return this.request<any>('/multi-network/federation/status');
  }

  async configureFederation(settings: {
    enabled: boolean;
    syncInterval?: number;
    allowedNetworks?: string[];
    dataTypes?: string[];
  }): Promise<ApiResponse<any>> {
    return this.request<any>('/multi-network/federation/configure', {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  }

  async reloadNetworkConfigurations(): Promise<ApiResponse<any>> {
    return this.request<any>('/multi-network/reload', {
      method: 'POST'
    });
  }

  async testNetworkIsolation(networkId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/multi-network/networks/${networkId}/isolation-test`);
  }

  async exportStatistics(
    format: 'csv' | 'json' | 'pdf',
    type: 'network' | 'messages' | 'utilization',
    networkId?: string
  ): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('format', format);
    params.append('type', type);
    if (networkId) params.append('networkId', networkId);
    
    const url = `${API_BASE_URL}/v1/statistics/export?${params.toString()}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': format === 'csv' ? 'text/csv' : 
                 format === 'pdf' ? 'application/pdf' : 
                 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Statistics export failed: ${response.status}`);
    }
    
    return response.blob();
  }

  async getDatabaseOverview(): Promise<ApiResponse<any>> {
    return this.request<any>('/statistics/database-overview');
  }

  async getMessageTimeline(
    options: {
      networkId?: string;
      days?: number;
      intervalMinutes?: number;
    } = {}
  ): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = `/statistics/message-timeline${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request<any>(endpoint);
  }

  async getTopTalkers(
    options: {
      limit?: number;
      networkId?: string;
      requireShortName?: boolean;
    } = {}
  ): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = `/statistics/top-talkers${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request<any>(endpoint);
  }

  // RF Links API methods
  async getRFLinks(
    options: {
      hours?: number;
      mergeBidirectional?: boolean;
    } = {}
  ): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = `/map/links${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request<any>(endpoint);
  }

  async getRFLinkStats(): Promise<ApiResponse<any>> {
    return this.request<any>('/map/links/stats');
  }

  async clearRFLinkCache(): Promise<ApiResponse<any>> {
    return this.request<any>('/map/links/clear-cache', {
      method: 'POST'
    });
  }

  // Generic GET method for custom endpoints
  async get<T = any>(endpoint: string, options?: { params?: any }): Promise<ApiResponse<T>> {
    if (options?.params) {
      const params = new URLSearchParams(options.params).toString();
      const url = params ? `${endpoint}?${params}` : endpoint;
      return this.request<T>(url, { method: 'GET' });
    }
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // Line of Sight Analysis API methods
  async getLineOfSight(fromNodeId: string, toNodeId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/analysis/line-of-sight?from=${fromNodeId}&to=${toNodeId}`);
  }
}

// Export a singleton instance
export const apiService = new ApiService();
export default apiService;