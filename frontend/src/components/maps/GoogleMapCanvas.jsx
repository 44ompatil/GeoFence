import { useState, useEffect, useRef } from 'react';
import {
  Crosshair,
  Plus,
  Minus,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  loadGoogleMaps,
  GEOFENCE_MAP_STYLE,
  createCustomOverlay,
} from '../../utils/googleMapsLoader';
import {
  usePersistedMapType,
  getLastMapCenter,
  setLastMapCenter,
  getLastMapZoom,
  setLastMapZoom,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
} from '../../utils/mapPreferences';
import { useUserLocation } from '../../hooks/useUserLocation';

export default function GoogleMapCanvas({
  center,
  zoom,
  pets = [],
  selectedPet = null,
  safeZones = [],
  interactiveZone = null,
  onSelectPet,
  onEditZone,
  onDeleteZone,
  onRecenter,
  className = 'h-full w-full',
  showControls = true,
  controlsPosition = 'default',
}) {
  const mapDivRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const googleMapsRef = useRef(null);

  // Overlays & Layers References
  const zoneLayersRef = useRef([]);
  const petOverlaysRef = useRef([]);
  const userOverlayRef = useRef(null);
  const interactiveLayersRef = useRef({
    circle: null,
    polygon: null,
    centerOverlay: null,
    radiusOverlay: null,
    vertexMarkers: [],
  });

  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState(null);
  const [locationToast, setLocationToast] = useState(null);

  // Persisted Map Type across all views & page refreshes (Roadmap vs Satellite)
  const [mapMode, setMapMode] = usePersistedMapType();

  // User Geolocation (for distinct RED marker & crosshair centering)
  const { userLocation, isLocating, requestCurrentLocation } = useUserLocation();

  // Determine initial center and zoom
  const initialCenter = center?.lat && center?.lng
    ? { lat: Number(center.lat), lng: Number(center.lng) }
    : selectedPet?.lat && selectedPet?.lng
    ? { lat: Number(selectedPet.lat), lng: Number(selectedPet.lng) }
    : getLastMapCenter();

  const initialZoom = typeof zoom === 'number' ? zoom : getLastMapZoom();

  // 1. Initialize Google Map Canvas once
  useEffect(() => {
    let isMounted = true;

    loadGoogleMaps()
      .then((maps) => {
        if (!isMounted || !mapDivRef.current) return;
        googleMapsRef.current = maps;

        const currentMapType = mapMode === 'Satellite' ? 'hybrid' : 'roadmap';

        const map = new maps.Map(mapDivRef.current, {
          center: initialCenter,
          zoom: initialZoom,
          disableDefaultUI: true,
          styles: currentMapType === 'roadmap' ? GEOFENCE_MAP_STYLE : [],
          mapTypeId: currentMapType,
          gestureHandling: 'greedy',
          clickableIcons: false,
        });

        mapInstanceRef.current = map;

        // Track user drag/zoom to persist camera location across tabs smoothly
        map.addListener('idle', () => {
          const c = map.getCenter();
          if (c) {
            setLastMapCenter({ lat: c.lat(), lng: c.lng() });
          }
          setLastMapZoom(map.getZoom());
        });

        setMapReady(true);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Google Maps Load Error:', err);
        setError(err.message || 'Failed to load Google Maps JavaScript API.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
      setMapReady(false);
      // Cleanup all layers
      zoneLayersRef.current.forEach((item) => item.setMap && item.setMap(null));
      zoneLayersRef.current = [];

      petOverlaysRef.current.forEach((o) => o.setMap && o.setMap(null));
      petOverlaysRef.current = [];

      if (userOverlayRef.current?.setMap) {
        userOverlayRef.current.setMap(null);
      }

      cleanupInteractiveLayers();
      mapInstanceRef.current = null;
    };
  }, []);

  // Cleanup helper for interactive draft zone
  const cleanupInteractiveLayers = () => {
    if (interactiveLayersRef.current.circle?.setMap) {
      interactiveLayersRef.current.circle.setMap(null);
    }
    if (interactiveLayersRef.current.polygon?.setMap) {
      interactiveLayersRef.current.polygon.setMap(null);
    }
    if (interactiveLayersRef.current.centerOverlay?.setMap) {
      interactiveLayersRef.current.centerOverlay.setMap(null);
    }
    if (interactiveLayersRef.current.radiusOverlay?.setMap) {
      interactiveLayersRef.current.radiusOverlay.setMap(null);
    }
    interactiveLayersRef.current.vertexMarkers.forEach(
      (m) => m.setMap && m.setMap(null)
    );
    interactiveLayersRef.current = {
      circle: null,
      polygon: null,
      centerOverlay: null,
      radiusOverlay: null,
      vertexMarkers: [],
    };
  };

  // 2. Map / Satellite Mode Synchronization
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (mapMode === 'Satellite') {
      map.setMapTypeId('hybrid');
    } else {
      map.setMapTypeId('roadmap');
      map.setOptions({ styles: GEOFENCE_MAP_STYLE });
    }
  }, [mapReady, mapMode]);

  // 3. Smooth Pan when Center Prop Changes
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !center?.lat || !center?.lng) return;
    mapInstanceRef.current.panTo({
      lat: Number(center.lat),
      lng: Number(center.lng),
    });
  }, [mapReady, center?.lat, center?.lng]);

  // 4. Render Saved Safe Zones (Always Persistent on Dashboard, Overview, and Background in Add/Edit Zone)
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !googleMapsRef.current) return;
    const map = mapInstanceRef.current;
    const maps = googleMapsRef.current;

    // Clear previous zone overlays
    zoneLayersRef.current.forEach((item) => item.setMap && item.setMap(null));
    zoneLayersRef.current = [];

    // Filter out the zone currently being edited so the draft layer takes precedence without double rendering
    const zonesToRender = safeZones.filter((z) => {
      if (interactiveZone?.editingZoneId && z.id === interactiveZone.editingZoneId) {
        return false;
      }
      return true;
    });

    zonesToRender.forEach((zone) => {
      const color = zone.borderColor || zone.badgeColor || (zone.status === 'Restricted' ? '#D32F2F' : '#005A36');
      const isDanger = zone.status === 'Restricted' || zone.badgeColor === '#D32F2F' || color === '#D32F2F';

      let shapeLayer = null;
      let labelLat = null;
      let labelLng = null;

      if (zone.shape === 'Polygon' && Array.isArray(zone.polygonPoints) && zone.polygonPoints.length >= 3) {
        const paths = zone.polygonPoints
          .map((p) => ({
            lat: typeof p.lat === 'number' ? p.lat : parseFloat(p.lat),
            lng: typeof p.lng === 'number' ? p.lng : parseFloat(p.lng),
          }))
          .filter((p) => !isNaN(p.lat) && !isNaN(p.lng));

        if (paths.length >= 3) {
          shapeLayer = new maps.Polygon({
            paths,
            strokeColor: color,
            strokeOpacity: interactiveZone ? 0.65 : 0.95,
            strokeWeight: 3,
            fillColor: color,
            fillOpacity: interactiveZone ? 0.08 : isDanger ? 0.25 : 0.18,
            map,
            clickable: false,
            zIndex: 10,
          });

          labelLat = paths.reduce((sum, p) => sum + p.lat, 0) / paths.length;
          labelLng = paths.reduce((sum, p) => sum + p.lng, 0) / paths.length;
        }
      } else if (zone.center) {
        const centerLat = typeof zone.center.lat === 'number' ? zone.center.lat : parseFloat(zone.center.lat);
        const centerLng = typeof zone.center.lng === 'number' ? zone.center.lng : parseFloat(zone.center.lng);
        const radiusMeters =
          typeof zone.radiusMeters === 'number'
            ? zone.radiusMeters
            : typeof zone.radius === 'number'
            ? zone.radius
            : parseFloat(zone.radius) || 100;

        if (!isNaN(centerLat) && !isNaN(centerLng)) {
          shapeLayer = new maps.Circle({
            center: { lat: centerLat, lng: centerLng },
            radius: radiusMeters,
            strokeColor: color,
            strokeOpacity: interactiveZone ? 0.65 : 0.95,
            strokeWeight: 3,
            fillColor: color,
            fillOpacity: interactiveZone ? 0.08 : isDanger ? 0.25 : 0.18,
            map,
            clickable: false,
            zIndex: 10,
          });

          labelLat = centerLat;
          labelLng = centerLng;
        }
      }

      if (shapeLayer) {
        zoneLayersRef.current.push(shapeLayer);

        // Add HTML Zone Badge Label with optional Edit / Delete buttons
        if (labelLat !== null && labelLng !== null) {
          const badgeElem = document.createElement('div');
          badgeElem.className =
            'flex items-center gap-1.5 select-none pointer-events-auto -translate-x-1/2 -translate-y-1/2';

          const titleSpan = document.createElement('span');
          titleSpan.className =
            'rounded-md px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm whitespace-nowrap';
          titleSpan.style.backgroundColor = zone.badgeColor || color;
          titleSpan.textContent = zone.name;
          badgeElem.appendChild(titleSpan);

          if ((onEditZone || onDeleteZone) && !interactiveZone) {
            const btnGroup = document.createElement('div');
            btnGroup.className = 'flex items-center gap-1';

            if (onEditZone) {
              const editBtn = document.createElement('button');
              editBtn.className =
                'flex h-5 w-5 items-center justify-center rounded bg-white text-gray-700 shadow-xs hover:bg-gray-100 hover:text-gray-900 border border-gray-200 cursor-pointer';
              editBtn.innerHTML =
                '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
              editBtn.title = `Edit ${zone.name}`;
              editBtn.onclick = (e) => {
                e.stopPropagation();
                onEditZone(zone);
              };
              btnGroup.appendChild(editBtn);
            }

            if (onDeleteZone) {
              const delBtn = document.createElement('button');
              delBtn.className =
                'flex h-5 w-5 items-center justify-center rounded bg-white text-rose-500 shadow-xs hover:bg-rose-50 hover:text-rose-600 border border-gray-200 cursor-pointer';
              delBtn.innerHTML =
                '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>';
              delBtn.title = `Delete ${zone.name}`;
              delBtn.onclick = (e) => {
                e.stopPropagation();
                onDeleteZone(zone);
              };
              btnGroup.appendChild(delBtn);
            }

            badgeElem.appendChild(btnGroup);
          }

          const overlay = createCustomOverlay(
            maps,
            { lat: labelLat, lng: labelLng },
            badgeElem,
            { zIndex: '500' }
          );
          overlay.setMap(map);
          zoneLayersRef.current.push(overlay);
        }
      }
    });
  }, [mapReady, safeZones, onEditZone, onDeleteZone, interactiveZone]);

  // 5. Render All Pet Markers (Every Pet Stays Visible & Tracked across all map views)
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !googleMapsRef.current) return;
    const map = mapInstanceRef.current;
    const maps = googleMapsRef.current;

    // Clear previous pet overlays
    petOverlaysRef.current.forEach((o) => o.setMap && o.setMap(null));
    petOverlaysRef.current = [];

    // Complete list of all pets from state
    const allPets = pets.length > 0 ? pets : selectedPet ? [selectedPet] : [];

    allPets.forEach((pet) => {
      const petLat = typeof pet.lat === 'number' ? pet.lat : parseFloat(pet.lat);
      const petLng = typeof pet.lng === 'number' ? pet.lng : parseFloat(pet.lng);
      if (isNaN(petLat) || isNaN(petLng)) return;

      const isSelected = selectedPet?.id === pet.id;
      const isCaution = pet.status?.toLowerCase() === 'caution';
      const statusColor = isCaution ? '#E68A00' : '#005A36';
      const petInitial = pet.initial || pet.name?.charAt(0) || 'P';

      const petElem = document.createElement('div');
      petElem.className =
        'relative flex flex-col items-center select-none cursor-pointer transition-transform duration-200 -translate-x-1/2 -translate-y-full';

      if (isSelected) {
        petElem.classList.add('z-50', 'scale-105');
      } else {
        petElem.classList.add('z-30', 'opacity-90', 'hover:opacity-100', 'hover:scale-105');
      }

      petElem.innerHTML = `
        <!-- Tooltip -->
        <div class="mb-1 flex flex-col items-center rounded-lg bg-white px-2 py-0.5 text-center shadow-md border border-gray-100/90 whitespace-nowrap">
          <div class="flex items-center gap-1 text-[11px] font-bold text-gray-900 leading-tight">
            <span>🐕</span>
            <span>${pet.name}</span>
          </div>
          ${
            isSelected
              ? `<span class="text-[9px] font-bold leading-tight" style="color: ${statusColor};">${pet.status || 'Safe'}</span>`
              : ''
          }
        </div>

        <!-- Pulse & Avatar Marker -->
        <div class="relative flex items-center justify-center">
          ${
            isSelected
              ? `<span class="absolute inline-flex h-12 w-12 rounded-full opacity-40 animate-ping" style="background-color: ${statusColor};"></span>`
              : ''
          }
          <div class="flex h-9 w-9 items-center justify-center rounded-full text-white font-bold text-sm shadow-md ring-3 ring-white/95" style="background-color: ${statusColor};">
            ${petInitial}
          </div>
        </div>
      `;

      petElem.onclick = (e) => {
        e.stopPropagation();
        if (onSelectPet) onSelectPet(pet);
      };

      const overlay = createCustomOverlay(
        maps,
        { lat: petLat, lng: petLng },
        petElem,
        { zIndex: isSelected ? '1000' : '900' }
      );
      overlay.setMap(map);
      petOverlaysRef.current.push(overlay);
    });
  }, [mapReady, pets, selectedPet, onSelectPet]);

  // 6. Render Distinct RED User Location Marker
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !googleMapsRef.current) return;
    const map = mapInstanceRef.current;
    const maps = googleMapsRef.current;

    if (userOverlayRef.current?.setMap) {
      userOverlayRef.current.setMap(null);
      userOverlayRef.current = null;
    }

    if (!userLocation?.lat || !userLocation?.lng) return;
    const userLat = typeof userLocation.lat === 'number' ? userLocation.lat : parseFloat(userLocation.lat);
    const userLng = typeof userLocation.lng === 'number' ? userLocation.lng : parseFloat(userLocation.lng);
    if (isNaN(userLat) || isNaN(userLng)) return;

    const userElem = document.createElement('div');
    userElem.className =
      'relative flex flex-col items-center select-none pointer-events-none -translate-x-1/2 -translate-y-1/2 z-40';

    userElem.innerHTML = `
      <!-- Tooltip -->
      <div class="mb-1 rounded-md bg-white px-2 py-0.5 text-center shadow-md border border-rose-100 whitespace-nowrap">
        <span class="text-[10px] font-bold text-rose-600 flex items-center gap-1">
          <span class="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse"></span>
          You (Owner)
        </span>
      </div>

      <!-- Pulse Marker -->
      <div class="relative flex items-center justify-center">
        <span class="absolute inline-flex h-10 w-10 rounded-full bg-rose-500 opacity-40 animate-ping"></span>
        <div class="flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg ring-3 ring-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="5"/>
            <path d="M20 21a8 8 0 0 0-16 0"/>
          </svg>
        </div>
      </div>
    `;

    const overlay = createCustomOverlay(
      maps,
      { lat: userLat, lng: userLng },
      userElem,
      { zIndex: '950' }
    );
    overlay.setMap(map);
    userOverlayRef.current = overlay;
  }, [mapReady, userLocation]);

  // 7. Interactive Zone Mode (Add / Edit Safe Zone with Native Circle Dragging)
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !googleMapsRef.current || !interactiveZone) {
      cleanupInteractiveLayers();
      return;
    }

    const map = mapInstanceRef.current;
    const maps = googleMapsRef.current;
    const {
      mode = 'Circle',
      center: zoneCenter,
      radius: zoneRadius = 50,
      zoneName = 'Home',
      onCenterChange,
      polygonPoints = [],
      onPolygonPointsChange,
    } = interactiveZone;

    cleanupInteractiveLayers();

    // Map click repositions center directly
    const mapClickListener = map.addListener('click', (e) => {
      if (onCenterChange) {
        onCenterChange({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      }
    });

    if (mode === 'Circle') {
      const targetCenter = zoneCenter?.lat && zoneCenter?.lng
        ? { lat: Number(zoneCenter.lat), lng: Number(zoneCenter.lng) }
        : DEFAULT_MAP_CENTER;

      const numRadius = Number(zoneRadius) || 50;

      // 1. Natively Draggable Circle (Dragging circle moves it without panning map!)
      const circle = new maps.Circle({
        center: targetCenter,
        radius: numRadius,
        strokeColor: '#005A36',
        strokeOpacity: 0.95,
        strokeWeight: 3,
        fillColor: '#005A36',
        fillOpacity: 0.2,
        map,
        draggable: true, // Native Google Maps drag handler
        clickable: true,
        zIndex: 100,
      });
      interactiveLayersRef.current.circle = circle;

      // 2. Center Pin Overlay
      const centerElem = document.createElement('div');
      centerElem.className =
        'relative flex flex-col items-center select-none pointer-events-none -translate-x-1/2 -translate-y-1/2';

      centerElem.innerHTML = `
        <div class="flex h-8 w-8 items-center justify-center rounded-full bg-[#005A36] text-white shadow-md ring-2 ring-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </div>
        <div class="mt-1 flex items-center gap-1 rounded-md bg-white px-2.5 py-0.5 text-[11px] font-bold text-gray-900 shadow-md border border-gray-100 whitespace-nowrap">
          <span style="color: #005A36;">📍</span>
          <span>${zoneName || 'Home'}</span>
        </div>
      `;

      const centerOverlay = createCustomOverlay(maps, targetCenter, centerElem, {
        zIndex: '1000',
      });
      centerOverlay.setMap(map);
      interactiveLayersRef.current.centerOverlay = centerOverlay;

      // 3. Top Radius Label Badge Overlay
      const latOffset = (numRadius / 6378137) * (180 / Math.PI);
      const topLat = targetCenter.lat + latOffset;

      const radiusElem = document.createElement('div');
      radiusElem.className =
        'rounded-md bg-white px-2.5 py-0.5 text-[11px] font-bold text-gray-800 shadow-sm border border-gray-100 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap pointer-events-none';
      radiusElem.textContent = `${numRadius} m`;

      const radiusOverlay = createCustomOverlay(
        maps,
        { lat: topLat, lng: targetCenter.lng },
        radiusElem,
        { zIndex: '800' }
      );
      radiusOverlay.setMap(map);
      interactiveLayersRef.current.radiusOverlay = radiusOverlay;

      // When circle is dragged, synchronize center & radius overlays live
      const dragListener = circle.addListener('drag', () => {
        const newPos = circle.getCenter();
        if (newPos) {
          const lat = newPos.lat();
          const lng = newPos.lng();
          centerOverlay.setPosition({ lat, lng });
          const newTopLat = lat + latOffset;
          radiusOverlay.setPosition({ lat: newTopLat, lng });
        }
      });

      const dragEndListener = circle.addListener('dragend', () => {
        const newPos = circle.getCenter();
        if (newPos && onCenterChange) {
          onCenterChange({ lat: newPos.lat(), lng: newPos.lng() });
        }
      });

      return () => {
        if (mapClickListener?.remove) mapClickListener.remove();
        if (dragListener?.remove) dragListener.remove();
        if (dragEndListener?.remove) dragEndListener.remove();
      };
    } else if (mode === 'Polygon' && polygonPoints.length) {
      // Polygon Mode
      const paths = polygonPoints.map((p) => ({
        lat: Number(p.lat),
        lng: Number(p.lng),
      }));

      const polygon = new maps.Polygon({
        paths,
        strokeColor: '#005A36',
        strokeOpacity: 0.95,
        strokeWeight: 3,
        fillColor: '#005A36',
        fillOpacity: 0.2,
        map,
        clickable: false,
        zIndex: 100,
      });
      interactiveLayersRef.current.polygon = polygon;

      // Draggable vertex handles
      polygonPoints.forEach((point, idx) => {
        const marker = new maps.Marker({
          position: { lat: Number(point.lat), lng: Number(point.lng) },
          map,
          draggable: true,
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: '#005A36',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2.5,
          },
          zIndex: 200,
        });

        marker.addListener('drag', (e) => {
          const newPt = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          const newPoints = [...polygonPoints];
          newPoints[idx] = newPt;
          polygon.setPaths(newPoints.map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) })));
        });

        marker.addListener('dragend', (e) => {
          const newPt = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          if (onPolygonPointsChange) {
            onPolygonPointsChange((prev) => {
              const next = [...prev];
              next[idx] = newPt;
              return next;
            });
          }
        });

        interactiveLayersRef.current.vertexMarkers.push(marker);
      });

      return () => {
        if (mapClickListener?.remove) mapClickListener.remove();
      };
    }
  }, [mapReady, interactiveZone]);

  // Controls Handlers
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setZoom(mapInstanceRef.current.getZoom() + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setZoom(mapInstanceRef.current.getZoom() - 1);
    }
  };

  // Dedicated Crosshair Button Handler: Smoothly pans to the User's REAL Browser Location
  const handleCenterOnUserLocation = async () => {
    if (!mapInstanceRef.current) return;

    if (userLocation?.lat && userLocation?.lng) {
      mapInstanceRef.current.panTo({
        lat: Number(userLocation.lat),
        lng: Number(userLocation.lng),
      });
      if (onRecenter) onRecenter();
      return;
    }

    try {
      const coords = await requestCurrentLocation();
      if (mapInstanceRef.current && coords) {
        mapInstanceRef.current.panTo({
          lat: Number(coords.lat),
          lng: Number(coords.lng),
        });
      }
      if (onRecenter) onRecenter();
    } catch (err) {
      const msg = err.message || 'Location permission denied in browser.';
      setLocationToast(msg);
      setTimeout(() => setLocationToast(null), 3500);
    }
  };

  return (
    <div
      className={`relative ${className} min-h-[360px] overflow-hidden rounded-2xl bg-[#DFE5D5]`}
    >
      {/* 1. Google Maps Canvas Container */}
      <div ref={mapDivRef} className="absolute inset-0 h-full w-full" />

      {/* 2. Loading Spinner */}
      {loading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#DFE5D5]/90 backdrop-blur-xs text-gray-700">
          <Loader2 className="h-8 w-8 animate-spin text-[#005A36] mb-2" />
          <p className="text-xs sm:text-sm font-semibold text-gray-800">
            Loading Google Maps...
          </p>
        </div>
      )}

      {/* 3. API Key Missing / Error State */}
      {error && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#FAFBF7] p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-3 border border-amber-200">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900">
            {error.toLowerCase().includes('missing')
              ? 'Google Maps API Key Required'
              : 'Google Maps Error'}
          </h3>
          <p className="text-xs text-gray-600 mt-1 max-w-sm">{error}</p>
          {error.toLowerCase().includes('missing') && (
            <div className="mt-4 rounded-xl bg-gray-100 px-3.5 py-2 text-[11px] font-mono text-gray-700">
              VITE_GOOGLE_MAPS_API_KEY=your_key_here
            </div>
          )}
        </div>
      )}

      {/* 4. Dragging Cue (Positioned at TOP-CENTER to avoid overlapping controls) */}
      {interactiveZone && !loading && !error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-xs px-4 py-1.5 text-xs font-semibold text-gray-800 shadow-md border border-gray-200/90 whitespace-nowrap">
            <span className="h-2 w-2 rounded-full bg-[#005A36] animate-pulse" />
            <span>
              {interactiveZone.mode === 'Circle'
                ? 'Drag circle or click map to move zone'
                : 'Drag handles to reshape boundary'}
            </span>
          </div>
        </div>
      )}

      {/* 5. Gentle Location Toast when Crosshair clicked without permission */}
      {locationToast && (
        <div className="absolute bottom-16 right-4 z-30 flex items-center gap-1.5 rounded-xl bg-gray-900/90 backdrop-blur-xs px-3 py-1.5 text-xs text-white shadow-lg border border-gray-700 pointer-events-none max-w-xs animate-in fade-in duration-200">
          <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <span>{locationToast}</span>
        </div>
      )}

      {/* 6. Controls: Map / Satellite Mode Switcher (Persisted globally) */}
      {showControls && !loading && !error && (
        <div
          className={`absolute z-20 ${
            controlsPosition === 'top-left' ? 'top-4 left-4' : 'bottom-4 left-4'
          }`}
        >
          <div className="flex items-center rounded-lg bg-white/95 backdrop-blur-xs p-0.5 shadow-md border border-gray-200 text-xs font-medium text-gray-700">
            <button
              type="button"
              onClick={() => setMapMode('Map')}
              className={`rounded-md px-2.5 py-1 transition-colors cursor-pointer ${
                mapMode === 'Map'
                  ? 'bg-gray-100 text-gray-900 font-semibold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Map
            </button>
            <button
              type="button"
              onClick={() => setMapMode('Satellite')}
              className={`rounded-md px-2.5 py-1 transition-colors cursor-pointer ${
                mapMode === 'Satellite'
                  ? 'bg-gray-100 text-gray-900 font-semibold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Satellite
            </button>
          </div>
        </div>
      )}

      {/* 7. Controls: Recenter & Zoom (+ / -) */}
      {showControls && !loading && !error && (
        <div className="absolute bottom-4 right-4 z-20 flex flex-col items-center gap-2">
          {/* User Location Crosshair Control */}
          <button
            type="button"
            onClick={handleCenterOnUserLocation}
            aria-label="Center on my location"
            title="Center on my location"
            disabled={isLocating}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 backdrop-blur-xs text-gray-700 shadow-md border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isLocating ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#005A36]" />
            ) : (
              <Crosshair className="h-4 w-4" />
            )}
          </button>

          <div className="flex flex-col items-center rounded-lg bg-white/95 backdrop-blur-xs shadow-md border border-gray-200 divide-y divide-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={handleZoomIn}
              aria-label="Zoom In"
              className="flex h-7 w-8 items-center justify-center text-gray-700 hover:bg-gray-50 font-bold transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              aria-label="Zoom Out"
              className="flex h-7 w-8 items-center justify-center text-gray-700 hover:bg-gray-50 font-bold transition-colors cursor-pointer"
            >
              <Minus className="h-3.5 w-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
