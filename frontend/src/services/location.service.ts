/**
 * Location Service for mobile geolocation features
 * Handles GPS location tracking and user position management
 */

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface LocationServiceOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watchPosition?: boolean;
}

export interface LocationService {
  getCurrentPosition(): Promise<LocationData>;
  watchPosition(callback: (position: LocationData) => void): number | null;
  clearWatch(watchId: number): void;
  isLocationSupported(): boolean;
  requestPermission(): Promise<PermissionState>;
  getPermissionStatus(): Promise<PermissionState>;
}

class LocationServiceImpl implements LocationService {
  private watchId: number | null = null;
  private options: LocationServiceOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 60000, // 1 minute
    watchPosition: false,
  };

  constructor(options?: LocationServiceOptions) {
    if (options) {
      this.options = { ...this.options, ...options };
    }
  }

  isLocationSupported(): boolean {
    return 'geolocation' in navigator;
  }

  async requestPermission(): Promise<PermissionState> {
    if (!this.isLocationSupported()) {
      throw new Error('Geolocation is not supported by this browser');
    }

    try {
      // Try to get current position to trigger permission request
      await this.getCurrentPosition();
      return 'granted';
    } catch (error: any) {
      if (error.code === GeolocationPositionError.PERMISSION_DENIED) {
        return 'denied';
      }
      return 'prompt';
    }
  }

  async getPermissionStatus(): Promise<PermissionState> {
    if (!this.isLocationSupported()) {
      return 'denied';
    }

    try {
      // Check if permissions API is available
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        return permission.state;
      }
      
      // Fallback: try to get position with minimal timeout
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 1000,
          maximumAge: Infinity,
        });
      });
      return 'granted';
    } catch (error: any) {
      if (error.code === GeolocationPositionError.PERMISSION_DENIED) {
        return 'denied';
      }
      return 'prompt';
    }
  }

  getCurrentPosition(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!this.isLocationSupported()) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve(this.transformPosition(position));
        },
        (error) => {
          reject(this.transformError(error));
        },
        {
          enableHighAccuracy: this.options.enableHighAccuracy,
          timeout: this.options.timeout,
          maximumAge: this.options.maximumAge,
        }
      );
    });
  }

  watchPosition(callback: (position: LocationData) => void): number | null {
    if (!this.isLocationSupported()) {
      console.warn('Geolocation is not supported by this browser');
      return null;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        callback(this.transformPosition(position));
      },
      (error) => {
        console.error('Location watch error:', this.transformError(error));
      },
      {
        enableHighAccuracy: this.options.enableHighAccuracy,
        timeout: this.options.timeout,
        maximumAge: this.options.maximumAge,
      }
    );

    return this.watchId;
  }

  clearWatch(watchId: number): void {
    if (this.isLocationSupported()) {
      navigator.geolocation.clearWatch(watchId);
    }
    if (this.watchId === watchId) {
      this.watchId = null;
    }
  }

  private transformPosition(position: GeolocationPosition): LocationData {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude || undefined,
      heading: position.coords.heading || undefined,
      speed: position.coords.speed || undefined,
      timestamp: position.timestamp,
    };
  }

  private transformError(error: GeolocationPositionError): Error {
    let message = 'Unknown location error';
    
    switch (error.code) {
      case GeolocationPositionError.PERMISSION_DENIED:
        message = 'Location access denied by user';
        break;
      case GeolocationPositionError.POSITION_UNAVAILABLE:
        message = 'Location information unavailable';
        break;
      case GeolocationPositionError.TIMEOUT:
        message = 'Location request timed out';
        break;
    }

    const customError = new Error(message);
    (customError as any).code = error.code;
    return customError;
  }
}

// Create singleton instance
export const locationService = new LocationServiceImpl();

export default locationService;