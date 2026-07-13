'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';

interface MapPickerProps {
  center: [number, number];
  onPositionChange: (lat: number, lng: number) => void;
}

export default function MapPicker({ center, onPositionChange }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clean up previous instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, {
      center: center,
      zoom: 14,
      zoomControl: true,
    });

    // Use OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Custom marker icon (cyan colored for dark theme)
    const markerIcon = L.divIcon({
      html: `<div style="width:24px;height:24px;background:linear-gradient(135deg,#06b6d4,#0ea5e9);border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(6,182,212,0.5);"></div>`,
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const marker = L.marker(center, { draggable: true, icon: markerIcon }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      onPositionChange(pos.lat, pos.lng);
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      onPositionChange(e.latlng.lat, e.latlng.lng);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker position when center prop changes from outside
  useEffect(() => {
    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.setLatLng(center);
      mapInstanceRef.current.setView(center, mapInstanceRef.current.getZoom());
    }
  }, [center]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '200px' }} />;
}