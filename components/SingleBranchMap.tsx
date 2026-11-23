'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

type Props = {
  lat: number;
  lng: number;
  name: string;
  address: string;
};

// Tile loading error tracker to avoid infinite retry loops
let tileErrorCount = 0;
const MAX_TILE_ERRORS = 10;

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
    errorTileUrl: '',
  });

  layer.on('tileerror', () => {
    tileErrorCount++;
    if (tileErrorCount >= MAX_TILE_ERRORS && layer._map) {
      layer._map.removeLayer(layer);
      const fallback = L.tileLayer(fallbackUrl, {
        ...fallbackOptions,
        errorTileUrl: '',
      });
      layer._map.addLayer(fallback);
      setTimeout(() => {
        layer._map?.invalidateSize();
      }, 100);
    }
  });

  return layer;
}

export default function SingleBranchMap({ lat, lng, name, address }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const mapRef = useRef<any>(null);
  const initAttempts = useRef(0);
  const [tileLoadFailed, setTileLoadFailed] = useState(false);

  useEffect(() => {
    if (!ready || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Reset tile error counter
    tileErrorCount = 0;

    // Check if container has actual dimensions
    const containerEl = mapContainerRef.current;
    const hasDimensions = containerEl.clientWidth > 0 && containerEl.clientHeight > 0;
    if (!hasDimensions) {
      initAttempts.current++;
      if (initAttempts.current < 10) {
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
      dragging: !L.Browser.mobile,
      touchZoom: L.Browser.mobile,
    }).setView([lat, lng], 16);

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

    const showroomIcon = L.divIcon({
      className: 'custom-showroom-marker',
      html: `
        <div class="relative group">
          <div class="flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-2xl border-2 border-primary overflow-hidden transition-transform group-hover:scale-110">
            <img src="/logo.png" alt="YEC" class="w-10 h-10 object-contain" />
          </div>
          <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rotate-45 transform"></div>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 48],
    });

    const marker = L.marker([lat, lng], { icon: showroomIcon }).addTo(map);
    marker.bindPopup(`
      <div class="p-2 min-w-[150px]">
        <strong class="text-primary font-serif text-base block">${name}</strong>
        <p class="text-[11px] text-ink/70 mt-1 leading-relaxed">${address}</p>
        <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" 
           target="_blank" 
           class="mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary hover:underline">
          Yo'nalish olish ->
        </a>
      </div>
    `, {
      className: 'custom-popup',
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [ready, lat, lng, name, address]);

  // Fix Leaflet tile/container resize issue in dynamic layouts
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const timer = setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 300);
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
    <div className="relative h-full w-full overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl backdrop-blur-md">
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
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        }
      `}</style>
      <Script
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        onLoad={() => setReady(true)}
        strategy="afterInteractive"
      />
      <div ref={mapContainerRef} className="h-full w-full" />
      {tileLoadFailed && (
        <div className="absolute bottom-4 left-4 z-[1000] rounded-xl bg-amber-100 px-4 py-2 text-xs font-semibold text-amber-800 shadow-lg border border-amber-200">
          Xarita yuklanmoqda...
        </div>
      )}
    </div>
  );
}