import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

let isOptionsSet = false;
let loadPromise = null;

// Default map style matching the GeoFence Figma aesthetic (clean warm roads, sage parks, subtle labels)
export const GEOFENCE_MAP_STYLE = [
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#c9d7d6' }],
  },
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#dfe5d5' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#f4f6ec' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#e2e7d8' }, { weight: 1 }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#c8d6be' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'simplified' }],
  },
  {
    featureType: 'administrative',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4b5563' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b7280' }],
  },
];

export const DEFAULT_MAP_CENTER = { lat: 18.6445, lng: 73.7550 };
export const DEFAULT_MAP_ZOOM = 16;

/**
 * Loads the Google Maps JavaScript API asynchronously.
 * Consumes VITE_GOOGLE_MAPS_API_KEY from environment variables.
 * Uses modern functional importLibrary API and returns a unified maps namespace.
 */
export function loadGoogleMaps() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey === 'your_api_key' || apiKey === 'your_google_maps_api_key_here') {
    return Promise.reject(
      new Error(
        'Missing Google Maps API Key. Please set VITE_GOOGLE_MAPS_API_KEY in your frontend/.env file.'
      )
    );
  }

  if (loadPromise) {
    return loadPromise;
  }

  if (!isOptionsSet) {
    setOptions({
      key: apiKey,
      v: 'weekly',
    });
    isOptionsSet = true;
  }

  loadPromise = Promise.all([
    importLibrary('maps'),
    importLibrary('core'),
    importLibrary('places'),
    importLibrary('geometry'),
    importLibrary('marker'),
  ])
    .then(([mapsLib, coreLib, placesLib, geometryLib, markerLib]) => {
      const gMaps = {
        ...(window.google?.maps || {}),
        ...coreLib,
        ...mapsLib,
        ...placesLib,
        ...geometryLib,
        ...markerLib,
      };

      if (window.google) {
        window.google.maps = {
          ...window.google.maps,
          ...gMaps,
        };
      }

      return gMaps;
    })
    .catch((err) => {
      loadPromise = null;
      throw err;
    });

  return loadPromise;
}

/**
 * Creates a custom Google Maps OverlayView for rendering rich HTML DOM elements
 * (e.g. Pet pulse markers, Zone action labels, Draggable Center Pin).
 */
export function createCustomOverlay(maps, position, contentElement, options = {}) {
  const OverlayViewClass = maps?.OverlayView || window.google?.maps?.OverlayView;
  const LatLngClass = maps?.LatLng || window.google?.maps?.LatLng;

  if (!OverlayViewClass) {
    throw new Error('Google Maps OverlayView is not loaded.');
  }

  class CustomOverlay extends OverlayViewClass {
    constructor() {
      super();
      this.position = position;
      this.content = contentElement;
      this.options = options;
    }

    onAdd() {
      const panes = this.getPanes();
      const targetPane = this.options.pane || 'overlayMouseTarget';
      panes[targetPane].appendChild(this.content);
    }

    draw() {
      const projection = this.getProjection();
      if (!projection || !this.position) return;

      const latLng = LatLngClass
        ? new LatLngClass(this.position.lat, this.position.lng)
        : this.position;

      const point = projection.fromLatLngToDivPixel(latLng);

      if (point) {
        this.content.style.position = 'absolute';
        this.content.style.left = `${point.x}px`;
        this.content.style.top = `${point.y}px`;
        this.content.style.zIndex = this.options.zIndex || '100';
      }
    }

    onRemove() {
      if (this.content && this.content.parentNode) {
        this.content.parentNode.removeChild(this.content);
      }
    }

    setPosition(newPos) {
      this.position = newPos;
      this.draw();
    }
  }

  return new CustomOverlay();
}
