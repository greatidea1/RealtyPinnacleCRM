'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Map as MapIcon, Satellite } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MapPickerProps {
  center: [number, number];
  onPositionChange: (lat: number, lng: number) => void;
}

type MapBaseLayer = 'map' | 'satellite';

const TILE_LAYERS: Record<MapBaseLayer, { url: string; attribution: string; maxZoom: number }> = {
  map: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 19,
  },
};

/** Interactive Leaflet map with Map (street) default and optional Satellite basemap. */
export default function MapPicker({ center, onPositionChange }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const onPositionChangeRef = useRef(onPositionChange);
  const [baseLayer, setBaseLayer] = useState<MapBaseLayer>('map');

  useEffect(() => {
    onPositionChangeRef.current = onPositionChange;
  }, [onPositionChange]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, {
      center,
      zoom: 14,
      zoomControl: true,
    });

    const tileConfig = TILE_LAYERS.map;
    const tileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
      className: 'map-tiles-street',
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    const markerIcon = L.divIcon({
      html: `<div style="width:24px;height:24px;background:linear-gradient(135deg,#06b6d4,#0ea5e9);border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(6,182,212,0.5);"></div>`,
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const marker = L.marker(center, { draggable: true, icon: markerIcon }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      onPositionChangeRef.current(pos.lat, pos.lng);
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      onPositionChangeRef.current(e.latlng.lat, e.latlng.lng);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      tileLayerRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.setLatLng(center);
      mapInstanceRef.current.setView(center, mapInstanceRef.current.getZoom());
    }
  }, [center]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    const config = TILE_LAYERS[baseLayer];
    const tileLayer = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom,
      className: baseLayer === 'map' ? 'map-tiles-street' : 'map-tiles-satellite',
    }).addTo(map);
    tileLayerRef.current = tileLayer;
  }, [baseLayer]);

  /** Switches the basemap between street map and satellite imagery. */
  const handleBaseLayerChange = (layer: MapBaseLayer) => {
    setBaseLayer(layer);
  }; // end handleBaseLayerChange

  return (
    <div className="relative w-full h-full min-h-[200px]">
      <div ref={mapRef} className="w-full h-full min-h-[200px] rounded-xl overflow-hidden" />
      <div className="absolute top-3 right-3 z-[1000] flex rounded-lg overflow-hidden border border-border bg-background/95 shadow-lg backdrop-blur-sm">
        <button
          type="button"
          onClick={() => handleBaseLayerChange('map')}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium transition-colors',
            baseLayer === 'map'
              ? 'bg-cyan-500/15 text-cyan-400'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
          title="Map view"
        >
          <MapIcon className="w-3.5 h-3.5" />
          Map
        </button>
        <button
          type="button"
          onClick={() => handleBaseLayerChange('satellite')}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium transition-colors border-l border-border',
            baseLayer === 'satellite'
              ? 'bg-cyan-500/15 text-cyan-400'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
          title="Satellite view"
        >
          <Satellite className="w-3.5 h-3.5" />
          Satellite
        </button>
      </div>
    </div>
  );
} // end MapPicker
