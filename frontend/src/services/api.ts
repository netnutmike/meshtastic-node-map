// API service for making HTTP requests to the backend

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

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
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
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
  async getNodes(
    options: {
      networkId?: string;
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
    
    const endpoint = `/nodes${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request<any[]>(endpoint);
  }

  async getNode(nodeId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/nodes/${nodeId}`);
  }
}

// Export a singleton instance
export const apiService = new ApiService();
export default apiService;