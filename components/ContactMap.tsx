'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

type Branch = {
  name: string;
  lat: number;
  lng: number;
  description: string;
};

const BRANCHES: Branch[] = [
  {
    name: '1. Olim Polvon filiali',
    lat: 41.2294433,
    lng: 69.1730268,
    description: 'Toshkent halqa yoʻli, Olim Polvon milliy ta\'omlari restorani yonida'
  },
  {
    name: '2. Algoritim filiali',
    lat: 41.2621776,
    lng: 69.147668,
    description: 'Samarqand Darvoza koʻchasi, Algoritim daxasi',
  },
];

// Tile loading error tracker to avoid infinite retry loops
let tileErrorCount = 0;
const MAX_TILE_ERRORS = 10;
const TILE_TIMEOUT_MS = 8000;

/**
 * Creates a tile layer with fallback support.
 * If the primary tile fails too many times, it switches to fallback.
 */
function createResilientTileLayer(
  L: any,
  primaryUrl: string,
  primaryOptions: Record<string, unknown>,
  fallbackUrl: string,
  fallbackOptions: Record<string, unknown>,
) {
  const layer = L.tileLayer(primaryUrl, {
    ...primaryOptions,
    errorTileUrl: '', // prevents broken tile icon
  });

  // Intercept tile loading errors to trigger fallback
  layer.on('tileerror', () => {
    tileErrorCount++;
    if (tileErrorCount >= MAX_TILE_ERRORS && layer._map) {
      // Remove the broken layer and add fallback
      layer._map.removeLayer(layer);
      const fallback = L.tileLayer(fallbackUrl, {
        ...fallbackOptions,
        errorTileUrl: '',
      });
      layer._map.addLayer(fallback);

      // Also notify the map to resize
      setTimeout(() => {
        layer._map?.invalidateSize();
      }, 100);
    }
  });

  return layer;
}

export default function ContactMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const mapRef = useRef<any>(null);
  const [tileLoadFailed, setTileLoadFailed] = useState(false);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [fatalError, setFatalError] = useState(false);
  const initAttempts = useRef(0);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // If we detect offline, don't even attempt map initialization
    if (isOffline) {
      setFatalError(true);
      return;
    }

    // Reset tile error counter
    tileErrorCount = 0;

    // Check if container has actual dimensions
    const containerEl = mapContainerRef.current;
    const hasDimensions = containerEl.clientWidth > 0 && containerEl.clientHeight > 0;
    if (!hasDimensions) {
      initAttempts.current++;
      if (initAttempts.current < 10) {
        // Retry after a short delay if container is hidden / zero-size
        const retryTimer = setTimeout(() => {
          setReady(false);
          setTimeout(() => setReady(true), 50);
        }, 300);
        return () => clearTimeout(retryTimer);
      }
    }

    const map = L.map(containerEl, {
      zoomControl: false,
      scrollWheelZoom: false,
    }).setView([41.26, 69.15], 11);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Primary: OpenStreetMap tiles (more reliable than Google tiles)
    // Fallback: OpenStreetMap alternative servers
    const primaryUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const primaryOptions = {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      errorTileUrl: '',
    };
    const fallbackUrl = 'https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png';
    const fallbackOptions = {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      errorTileUrl: '',
    };

    const tileLayer = createResilientTileLayer(
      L,
      primaryUrl,
      primaryOptions,
      fallbackUrl,
      fallbackOptions,
    );

    // Detect tile load failure for UI feedback
    tileLayer.on('tileerror', () => {
      setTileLoadFailed(true);
    });

    tileLayer.on('load', () => {
      setTileLoadFailed(false);
    });

    tileLayer.addTo(map);

    BRANCHES.forEach((branch) => {
      const showroomIcon = L.divIcon({
        className: 'custom-showroom-marker',
        html: `
          <div class="relative group">
            <div class="flex items-center justify-center w-10 h-10 bg-white rounded-full shadow-lg border-2 border-primary overflow-hidden transition-transform group-hover:scale-110">
              <img src="/logo.png" alt="YEC" class="w-8 h-8 object-contain" />
            </div>
            <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rotate-45 transform"></div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });

      const marker = L.marker([branch.lat, branch.lng], { icon: showroomIcon }).addTo(map);
      marker.bindPopup(`
        <div class="p-2 min-w-[150px]">
          <strong class="text-primary font-serif text-base block">${branch.name}</strong>
          <p class="text-[11px] text-ink/70 mt-1 leading-relaxed">${branch.description}</p>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${branch.lat},${branch.lng}" 
             target="_blank" 
             class="mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary hover:underline">
            Yo'nalish olish ->
          </a>
        </div>
      `, {
        className: 'custom-popup',
      });
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    }, [ready]);

  // Fix Leaflet tile/container resize issue in dynamic layouts
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const timer = setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 200);
    const observer = new ResizeObserver(() => {
      mapRef.current?.invalidateSize();
    });
    if (mapContainerRef.current) {
      observer.observe(mapContainerRef.current);
    }
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [ready]);

  return (
    <div className="relative h-[450px] w-full overflow-hidden rounded-[2.5rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.15)] backdrop-blur-md">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>{`
        .custom-showroom-marker {
          background: none !important;
          border: none !important;
        }
        .leaflet-container {
          cursor: grab !important;
        }
        .leaflet-container:active {
          cursor: grabbing !important;
        }
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 1.5rem;
          padding: 8px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .custom-popup .leaflet-popup-tip {
          box-shadow: none;
        }
      `}</style>
      <Script
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        onLoad={() => setReady(true)}
        strategy="afterInteractive"
      />
      <div ref={mapContainerRef} className="h-full w-full" />
      {isOffline && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="rounded-2xl bg-white p-6 shadow-xl text-center max-w-xs border border-amber-200">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-4.243 4.243a1 1 0 010-1.414" />
              </svg>
            </div>
            <p className="font-bold text-ink text-sm">Internet aloqasi yo'q</p>
            <p className="text-xs text-ink/60 mt-1">Xaritani ko'rish uchun internetga ulaning</p>
          </div>
        </div>
      )}
      {fatalError && !isOffline && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="rounded-2xl bg-white p-6 shadow-xl text-center max-w-xs border border-red-200">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="font-bold text-ink text-sm">Xarita yuklanmadi</p>
            <p className="text-xs text-ink/60 mt-1">Iltimos, sahifani qayta yuklab ko'ring</p>
          </div>
        </div>
      )}
      <div className="absolute top-4 left-4 z-[1000] hidden md:block">
        <div className="rounded-2xl bg-white/90 p-4 shadow-xl backdrop-blur-md border border-white/20 max-w-xs">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink/40 mb-2">Filiallarimiz</p>
          <div className="space-y-3">
            {BRANCHES.map(b => (
              <div key={b.name} className="flex flex-col">
                <span className="text-sm font-bold text-ink">{b.name}</span>
                <span className="text-xs text-ink/60">{b.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
