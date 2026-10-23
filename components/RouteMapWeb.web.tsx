import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

type Coord = [number, number];
type Pin = { id: string; coordinate: Coord; label: string };
type CameraRef = React.MutableRefObject<any>;
export type RouteMapWebProps = {
  accessToken: string;
  cameraRef: CameraRef;
  onMapPress: (event: { geometry: { coordinates: Coord } }) => void;
  onCameraChanged: (event: { properties: { zoom: number; center: Coord } }) => void;
  centerCoordinate: Coord;
  startPoint: Pin | null;
  destinationPoint: Pin | null;
  selectedPin: Coord | null;
  waypoints: Pin[];
  routeGeometry: Coord[];
};

const validCoord = (coords: unknown): coords is Coord =>
  Array.isArray(coords) && coords.length >= 2 &&
  Number.isFinite(coords[0]) && Number.isFinite(coords[1]) &&
  Math.abs(coords[0]) <= 180 && Math.abs(coords[1]) <= 90;

function markerElement(label: string, color: string): HTMLElement {
  const element = document.createElement('div');
  element.textContent = label;
  element.style.cssText = `width:30px;height:30px;border-radius:50%;background:${color};color:#0f172a;display:flex;align-items:center;justify-content:center;font-weight:bold;border:2px solid white;box-shadow:0 2px 8px #0003;`;
  return element;
}

/** Browser-only canvas. The native screen/overlays are unchanged. */
export default function RouteMapWeb(props: RouteMapWebProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const el = container.current;
    if (!el || !props.accessToken) return;
    let cancelled = false;
    let frame = 0;
    // Wait for a measurable element; Mapbox GL may produce NaN for a 0x0 canvas.
    const mount = () => {
      if (cancelled) return;
      if (el.clientWidth === 0 || el.clientHeight === 0) {
        frame = requestAnimationFrame(mount);
        return;
      }
      mapboxgl.accessToken = props.accessToken;
      const map = new mapboxgl.Map({
        container: el,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: validCoord(propsRef.current.centerCoordinate) ? propsRef.current.centerCoordinate : [106.6882, 10.8225],
        zoom: 16,
      });
      mapRef.current = map;
      const fireCamera = () => {
        const center = map.getCenter();
        const zoom = map.getZoom();
        if (validCoord([center.lng, center.lat]) && Number.isFinite(zoom)) {
          propsRef.current.onCameraChanged({ properties: { zoom, center: [center.lng, center.lat] } });
        }
      };
      map.on('moveend', fireCamera);
      map.on('click', (event) => {
        const point: Coord = [event.lngLat.lng, event.lngLat.lat];
        if (validCoord(point)) propsRef.current.onMapPress({ geometry: { coordinates: point } });
      });
      propsRef.current.cameraRef.current = {
        setCamera: ({ centerCoordinate, zoomLevel, animationDuration }: {centerCoordinate?: Coord; zoomLevel?: number; animationDuration?: number}) => {
          if (!mapRef.current) return;
          const options: Parameters<mapboxgl.Map['easeTo']>[0] = {};
          if (validCoord(centerCoordinate)) options.center = centerCoordinate;
          if (typeof zoomLevel === 'number' && Number.isFinite(zoomLevel)) options.zoom = zoomLevel;
          options.duration = Number.isFinite(animationDuration) ? Math.max(0, animationDuration!) : 0;
          mapRef.current.easeTo(options);
        },
      };
      map.on('load', () => map.resize());
    };
    frame = requestAnimationFrame(mount);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      markers.current.forEach(m => m.remove());
      markers.current = [];
      propsRef.current.cameraRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // Deliberately init only once per token change, state is synced in separate effects.
  }, [props.accessToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markers.current.forEach(m => m.remove());
    markers.current = [];
    const add = (coordinate: unknown, text: string, color: string) => {
      if (!validCoord(coordinate)) return;
      const marker = new mapboxgl.Marker({ element: markerElement(text, color) })
        .setLngLat(coordinate).addTo(map);
      markers.current.push(marker);
    };
    add(props.selectedPin, '●', '#FCA5A5');
    add(props.startPoint?.coordinate, 'A', '#bee8ff');
    add(props.destinationPoint?.coordinate, 'B', '#f6eab2');
    props.waypoints.forEach(p => add(p.coordinate, p.label, '#0F172A'));
  }, [props.startPoint, props.destinationPoint, props.selectedPin, props.waypoints, props.accessToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const coordinates = props.routeGeometry.filter(validCoord);
    const sourceId = 'trekkez-route';
    const update = () => {
      if (!map.getStyle()) return;
      const existing = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
      if (coordinates.length < 2) {
        if (map.getLayer(sourceId)) map.removeLayer(sourceId);
        if (existing) map.removeSource(sourceId);
        return;
      }
      const feature = { type: 'Feature' as const, properties: {}, geometry: {type: 'LineString' as const, coordinates} };
      if (existing) existing.setData(feature);
      else {
        map.addSource(sourceId, {type:'geojson',data:feature});
        map.addLayer({ id:sourceId, type:'line', source:sourceId, paint:{ 'line-color':'#2563EB', 'line-width':6 }});
      }
    };
    if (map.isStyleLoaded()) update();
    else map.once('load', update);
    return () => { if (!map.isStyleLoaded()) map.off('load', update); };
  }, [props.routeGeometry, props.accessToken]);

  return <div ref={container} style={{ position: 'absolute', inset: 0, width:'100%', height:'100%' }}>
    {!props.accessToken && <div style={{position:'absolute',top:'50%',left:'10%',color:'#B91C1C',fontWeight:600}}>Thiếu EXPO_PUBLIC_MAPBOX_KEY</div>}
  </div>;
}
