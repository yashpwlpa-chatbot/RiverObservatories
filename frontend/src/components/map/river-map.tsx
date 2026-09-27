import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { api } from '@/lib/api';
import { MapLayerControl, type OverlayCounts, type OverlayState } from './map-layer-control';

interface RiverMapProps {
  riverId?: string;
  /** When set, this station is highlighted in WCT green. */
  stationId?: string;
  height?: number;
  showLayerControl?: boolean;
  className?: string;
}

interface GeoJsonResult {
  data: {
    layer: string;
    count: number;
    note?: string;
    geojson: { type: 'FeatureCollection'; features: GeoJSON.Feature[] };
  };
}

// WCT palette — scientific map styling.
const RIVER_COLOR = '#007F40';
const RIVER_ACTIVE_COLOR = '#006B36';
const STATION_COLOR = '#334155';
const STATION_ACTIVE_COLOR = '#007F40';
const STATE_FILL = '#EDF2F7';
const STATE_STROKE = '#94A3B8';
const DISTRICT_FILL = '#F4F7FA';
const DISTRICT_STROKE = '#CBD5E1';
const OSM_FALLBACK_URL = 'https://www.openstreetmap.org/export/embed.html?bbox=68.0%2C6.5%2C97.5%2C37.5&layer=mapnik';

function supportsWebGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

export function RiverMap({ riverId, stationId, height = 420, showLayerControl = true, className }: RiverMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const riverBoundsRef = useRef<maplibregl.LngLatBounds | null>(null);
  const stationBoundsRef = useRef<maplibregl.LngLatBounds | null>(null);
  const [tileError, setTileError] = useState(false);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const [basemap, setBasemap] = useState<'vector' | 'satellite'>('vector');
  const [overlays, setOverlays] = useState<OverlayState>({ rivers: true, stations: true, states: false, districts: false });
  const [counts, setCounts] = useState<OverlayCounts>({ rivers: 0, stations: 0, states: 0, districts: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fitRiver = () => {
    const map = mapRef.current;
    if (map && riverBoundsRef.current && !riverBoundsRef.current.isEmpty()) {
      map.fitBounds(riverBoundsRef.current, { padding: 60, maxZoom: 9, duration: 800 });
    }
  };

  const fitStation = () => {
    const map = mapRef.current;
    if (map && stationBoundsRef.current && !stationBoundsRef.current.isEmpty()) {
      map.fitBounds(stationBoundsRef.current, { padding: 80, maxZoom: 11, duration: 800 });
    }
  };

  const toggleFullscreen = () => {
    const el = wrapperRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapUnavailable) return;
    riverBoundsRef.current = null;
    stationBoundsRef.current = null;

    // A map must never take down the surrounding page. This is common in
    // privacy-hardened browsers, remote desktops, or devices with WebGL off.
    if (!supportsWebGl()) {
      setMapUnavailable(true);
      return;
    }

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {
            vector: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors',
            },
            satellite: {
              type: 'raster',
              tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
              tileSize: 256,
              attribution: '© Esri World Imagery',
            },
          },
          layers: [
            { id: 'basemap-vector', type: 'raster', source: 'vector' },
            { id: 'basemap-satellite', type: 'raster', source: 'satellite', layout: { visibility: 'none' } },
          ],
        },
        center: [79.5, 24.5],
        zoom: 4.4,
        attributionControl: { compact: true },
      });
    } catch {
      setMapUnavailable(true);
      return;
    }
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    map.on('error', (e) => {
      const msg = (e as unknown as { error?: { message?: string } })?.error?.message ?? '';
      if (/webgl|context/i.test(msg)) setMapUnavailable(true);
      else if (msg.includes('tile') || msg.includes('Failed to fetch')) setTileError(true);
    });

    const load = async () => {
      const results = await Promise.allSettled([
        api.get<GeoJsonResult>('/gis/geojson/rivers'),
        api.get<GeoJsonResult>(`/gis/geojson/stations${riverId ? `?riverId=${riverId}` : ''}`),
        api.get<GeoJsonResult>('/gis/geojson/states'),
        api.get<GeoJsonResult>('/gis/geojson/districts'),
      ]);

      const get = (i: number): GeoJsonResult['data'] =>
        results[i].status === 'fulfilled' ? results[i].value.data : { layer: '', count: 0, geojson: { type: 'FeatureCollection', features: [] } };

      const rivers = get(0);
      const stations = get(1);
      const states = get(2);
      const districts = get(3);

      setCounts({ rivers: rivers.count, stations: stations.count, states: states.count, districts: districts.count });

      // Rivers
      map.addSource('rivers', { type: 'geojson', data: rivers.geojson });
      map.addLayer({
        id: 'rivers-line', type: 'line', source: 'rivers',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': RIVER_COLOR, 'line-width': 1.6, 'line-opacity': 0.9 },
      });

      // Active river highlight
      if (riverId) {
        const active = rivers.geojson.features.filter((f) => (f.properties as Record<string, unknown>)?.id === riverId);
        if (active.length > 0) {
          map.addSource('active-river', { type: 'geojson', data: { type: 'FeatureCollection', features: active } });
          map.addLayer({
            id: 'active-river-line', type: 'line', source: 'active-river',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': RIVER_ACTIVE_COLOR, 'line-width': 3.5 },
          });
          const bounds = new maplibregl.LngLatBounds();
          (active[0].geometry as GeoJSON.LineString).coordinates.forEach((c) => bounds.extend(c as [number, number]));
          if (!bounds.isEmpty()) {
            riverBoundsRef.current = bounds;
            map.fitBounds(bounds, { padding: 60, maxZoom: 8, duration: 0 });
          }
        }
      }

      // Stations
      map.addSource('stations', { type: 'geojson', data: stations.geojson });
      map.addLayer({
        id: 'stations-point', type: 'circle', source: 'stations',
        paint: { 'circle-radius': 5, 'circle-color': STATION_COLOR, 'circle-stroke-width': 1.5, 'circle-stroke-color': '#ffffff' },
      });
      // Until a verified river line is available, frame the mapped locations.
      if (riverId && !riverBoundsRef.current && stations.geojson.features.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        stations.geojson.features.forEach((feature) => {
          if (feature.geometry?.type === 'Point') bounds.extend(feature.geometry.coordinates as [number, number]);
        });
        if (!bounds.isEmpty()) {
          riverBoundsRef.current = bounds;
          map.fitBounds(bounds, { padding: 85, maxZoom: 8, duration: 0 });
        }
      }

      // Selected station highlight (WCT green)
      if (stationId) {
        const active = stations.geojson.features.filter((f) => (f.properties as Record<string, unknown>)?.id === stationId);
        if (active.length > 0) {
          map.addSource('active-station', { type: 'geojson', data: { type: 'FeatureCollection', features: active } });
          map.addLayer({
            id: 'active-station-point', type: 'circle', source: 'active-station',
            paint: { 'circle-radius': 8, 'circle-color': STATION_ACTIVE_COLOR, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' },
          });
          const [lng, lat] = (active[0].geometry as GeoJSON.Point).coordinates as [number, number];
          const b = new maplibregl.LngLatBounds([lng, lat], [lng, lat]);
          stationBoundsRef.current = b;
        }
      }

      // States + districts (authoritative boundaries — empty until WCT GIS files exist)
      map.addSource('states', { type: 'geojson', data: states.geojson });
      map.addLayer({
        id: 'states-fill', type: 'fill', source: 'states',
        paint: { 'fill-color': STATE_FILL, 'fill-opacity': 0.5 },
      });
      map.addLayer({ id: 'states-line', type: 'line', source: 'states', paint: { 'line-color': STATE_STROKE, 'line-width': 0.7 } });

      map.addSource('districts', { type: 'geojson', data: districts.geojson });
      map.addLayer({
        id: 'districts-fill', type: 'fill', source: 'districts',
        paint: { 'fill-color': DISTRICT_FILL, 'fill-opacity': 0.5 },
      });
      map.addLayer({ id: 'districts-line', type: 'line', source: 'districts', paint: { 'line-color': DISTRICT_STROKE, 'line-width': 0.5 } });

      // Popups
      const popup = new maplibregl.Popup({ offset: 14 });
      map.on('click', 'stations-point', (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as Record<string, unknown>;
        popup
          .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
          .setHTML(`<strong>${escapeHtml(String(p.name ?? 'Station'))}</strong>${p.code ? `<br/><span>Code: ${escapeHtml(String(p.code))}</span>` : ''}`)
          .addTo(map);
      });
      map.on('click', 'rivers-line', (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as Record<string, unknown>;
        popup
          .setLngLat((e as unknown as { lngLat: { lng: number; lat: number } }).lngLat)
          .setHTML(`<strong>${escapeHtml(String(p.name ?? 'River'))}</strong>`)
          .addTo(map);
      });
      map.on('mouseenter', 'stations-point', () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', 'stations-point', () => (map.getCanvas().style.cursor = ''));
    };

    map.on('load', load);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riverId, stationId, mapUnavailable]);

  // Basemap toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const vis = (id: string, on: boolean) => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'); };
    vis('basemap-vector', basemap === 'vector');
    vis('basemap-satellite', basemap === 'satellite');
  }, [basemap]);

  // Overlay toggles
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const vis = (id: string, on: boolean) => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'); };
    vis('rivers-line', overlays.rivers);
    vis('active-river-line', overlays.rivers);
    vis('stations-point', overlays.stations);
    vis('active-station-point', overlays.stations);
    vis('states-fill', overlays.states);
    vis('states-line', overlays.states);
    vis('districts-fill', overlays.districts);
    vis('districts-line', overlays.districts);
  }, [overlays, riverId, stationId]);

  const ctrl = 'flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white text-muted-foreground shadow-sm transition-colors hover:text-foreground disabled:opacity-40';

  return (
    <div ref={wrapperRef} className={`relative overflow-hidden ${className ?? ''}`} style={{ height: isFullscreen ? '100vh' : height }}>
      {mapUnavailable ? (
        <div className="relative h-full bg-muted" role="status">
          <iframe
            className="h-full w-full border-0"
            src={OSM_FALLBACK_URL}
            title="OpenStreetMap overview of India"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-x-3 bottom-3 rounded-md border border-border bg-white/95 px-3 py-2 text-center text-xs text-muted-foreground shadow-sm">
            Basic OpenStreetMap view. Enable WebGL in your browser to use WCT river and station layers.
          </div>
        </div>
      ) : (
        <div ref={containerRef} className="h-full w-full" />
      )}
      {!mapUnavailable && tileError ? (
        <div className="absolute inset-x-0 bottom-0 bg-amber-50/95 px-3 py-1.5 text-xs text-amber-800">
          Base map tiles are unavailable in this environment (no network). The map will load fully when deployed with internet access.
        </div>
      ) : null}
      {!mapUnavailable && showLayerControl ? (
        <div className="absolute left-3 top-3">
          <MapLayerControl
            overlays={overlays}
            counts={counts}
            onToggle={(k) => setOverlays((o) => ({ ...o, [k]: !o[k] }))}
            basemap={basemap}
            onBasemap={setBasemap}
          />
        </div>
      ) : null}

      {/* Fit / fullscreen controls */}
      {!mapUnavailable ? <div className="absolute right-3 top-3 flex flex-col gap-1.5">
        <button className={ctrl} onClick={fitRiver} disabled={!riverBoundsRef.current} title="Fit to river" aria-label="Fit to river">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 14c2.5-2.5 5 2.5 7.5 0s5 2.5 7.5 0" /><path d="M4 18c2.5-2.5 5 2.5 7.5 0s5 2.5 7.5 0" /></svg>
        </button>
        <button className={ctrl} onClick={fitStation} disabled={!stationBoundsRef.current} title="Fit to selected station" aria-label="Fit to selected station">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 21s-7-5.1-7-11a7 7 0 0 1 14 0c0 5.9-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
        </button>
        <button className={ctrl} onClick={toggleFullscreen} title="Toggle fullscreen" aria-label="Toggle fullscreen">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            {isFullscreen ? <path d="M8 4v4H4M16 4v4h4M8 20v-4H4M16 20v-4h4" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
          </svg>
        </button>
      </div> : null}

      {/* Legend */}
      {!mapUnavailable ? <div className="absolute bottom-3 right-3 rounded-md border border-border bg-white/95 px-2.5 py-2 text-[11px] text-foreground shadow-sm">
        <p className="flex items-center gap-2 py-0.5"><span className="inline-block h-0.5 w-4 rounded bg-[#007F40]" /> River</p>
        <p className="flex items-center gap-2 py-0.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#334155]" /> Station</p>
        <p className="flex items-center gap-2 py-0.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#007F40] ring-2 ring-white" /> Selected</p>
      </div> : null}
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
