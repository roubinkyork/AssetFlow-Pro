/**
 * Enterprise Location & Geolocation Persistence Service
 * Conforms to ISO 55001 field telematics and GDPR privacy guidelines.
 * 
 * Prevents continuous browser permission prompts by persisting the user's
 * location preferences, authorization status, and cached facility GPS in localStorage.
 */

export interface SavedLocationData {
  lat: number;
  lng: number;
  accuracy: number;
  name: string;
  address?: string;
  savedAt: string;
  source: 'gps' | 'facility_default' | 'manual';
}

export type LocationPermissionPref = 'saved_granted' | 'saved_denied' | 'facility_default' | 'prompt';

const LOCATION_PREF_KEY = 'iso55001_location_pref_v1';
const SAVED_COORDINATES_KEY = 'iso55001_saved_gps_coords_v1';

// Enterprise default facility coordinates (Stuttgart Smart Operations Center)
export const DEFAULT_ENTERPRISE_LOCATION: SavedLocationData = {
  lat: 48.77584,
  lng: 9.18293,
  accuracy: 5,
  name: 'Central Operations Hub (Facility A)',
  address: 'Industriestraße 42, 70565 Stuttgart, Germany',
  savedAt: new Date().toISOString(),
  source: 'facility_default',
};

class LocationService {
  /**
   * Retrieves the saved location preference from localStorage.
   */
  getPreference(): LocationPermissionPref {
    if (typeof window === 'undefined') return 'facility_default';
    const pref = localStorage.getItem(LOCATION_PREF_KEY);
    if (pref === 'saved_granted' || pref === 'saved_denied' || pref === 'facility_default') {
      return pref;
    }
    return 'prompt';
  }

  /**
   * Persists the user's permission choice.
   */
  savePreference(pref: LocationPermissionPref): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LOCATION_PREF_KEY, pref);
  }

  /**
   * Retrieves the cached/saved location coordinates.
   */
  getSavedLocation(): SavedLocationData | null {
    if (typeof window === 'undefined') return DEFAULT_ENTERPRISE_LOCATION;
    try {
      const raw = localStorage.getItem(SAVED_COORDINATES_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * Saves coordinates to localStorage and marks permission as granted & remembered.
   */
  saveLocation(data: Omit<SavedLocationData, 'savedAt'>): SavedLocationData {
    const fullData: SavedLocationData = {
      ...data,
      savedAt: new Date().toISOString(),
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(SAVED_COORDINATES_KEY, JSON.stringify(fullData));
      localStorage.setItem(LOCATION_PREF_KEY, 'saved_granted');
    }
    return fullData;
  }

  /**
   * Check if location permission and coordinates are already saved.
   */
  hasSavedLocation(): boolean {
    const pref = this.getPreference();
    const loc = this.getSavedLocation();
    return (pref === 'saved_granted' && loc !== null) || pref === 'facility_default';
  }

  /**
   * Resets/clears location storage and returns to clean prompt state.
   */
  resetLocation(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(LOCATION_PREF_KEY);
    localStorage.removeItem(SAVED_COORDINATES_KEY);
  }

  /**
   * Quietly checks browser permission API status without prompting the user.
   */
  async queryNativePermission(): Promise<PermissionState | 'unsupported'> {
    if (typeof window === 'undefined' || !navigator.permissions) {
      return 'unsupported';
    }
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return status.state;
    } catch {
      return 'unsupported';
    }
  }

  /**
   * Safe getter: retrieves saved location if available, preventing unwanted browser prompts.
   * If forcePrompt is true or no saved location exists and preference is prompt, queries navigator.geolocation.
   */
  async getLocation(options: {
    forcePrompt?: boolean;
    defaultFallback?: SavedLocationData;
  } = {}): Promise<SavedLocationData> {
    const { forcePrompt = false, defaultFallback = DEFAULT_ENTERPRISE_LOCATION } = options;

    const pref = this.getPreference();
    const saved = this.getSavedLocation();

    // 1. If not forcing a prompt, use saved location or facility default immediately
    if (!forcePrompt) {
      if (pref === 'saved_granted' && saved) {
        return saved;
      }
      if (pref === 'facility_default' || pref === 'saved_denied') {
        return saved || defaultFallback;
      }
    }

    // 2. Query browser geolocation if supported
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      return new Promise<SavedLocationData>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc: SavedLocationData = {
              lat: Number(pos.coords.latitude.toFixed(5)),
              lng: Number(pos.coords.longitude.toFixed(5)),
              accuracy: Math.round(pos.coords.accuracy),
              name: 'Field Device GPS Fix (Auto-Saved)',
              address: 'Current Field Telemetry Coordinates',
              savedAt: new Date().toISOString(),
              source: 'gps',
            };
            this.saveLocation(loc);
            resolve(loc);
          },
          (err) => {
            console.warn('Geolocation prompt cancelled or failed, falling back to facility default and saving preference:', err);
            // Remember facility fallback so user is never prompted repeatedly
            const fallback: SavedLocationData = {
              ...defaultFallback,
              savedAt: new Date().toISOString(),
              source: 'facility_default',
            };
            this.savePreference('facility_default');
            this.saveLocation(fallback);
            resolve(fallback);
          },
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 600000 }
        );
      });
    }

    // 3. Fallback to default
    return defaultFallback;
  }
}

export const locationService = new LocationService();
