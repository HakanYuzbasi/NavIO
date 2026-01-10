/**
 * FloorPlanMap Component
 *
 * Displays a floor plan using Leaflet.js with custom CRS.Simple coordinate system
 * Renders nodes, edges, POIs, and navigation routes
 */
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FloorPlanWithGraph, RouteResponse, Coordinate } from '../types';
import { pixelToLeaflet, getLeafletBounds } from '../utils/coordinates';

interface FloorPlanMapProps {
  floorPlan: FloorPlanWithGraph;
  route?: RouteResponse | null;
  onMapClick?: (x: number, y: number) => void;
  showNodes?: boolean;
  showEdges?: boolean;
  showPOIs?: boolean;
}

const FloorPlanMap: React.FC<FloorPlanMapProps> = ({
  floorPlan,
  route,
  onMapClick,
  showNodes = true,
  showEdges = true,
  showPOIs = true,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [layerGroups, setLayerGroups] = useState<{
    edges: L.LayerGroup;
    nodes: L.LayerGroup;
    pois: L.LayerGroup;
    route: L.LayerGroup;
  } | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const bounds = getLeafletBounds(floorPlan.image_width, floorPlan.image_height);

    // Create map with CRS.Simple for non-geographical coordinates
    const map = L.map(mapContainerRef.current, {
      crs: L.CRS.Simple,
      minZoom: -2,
      maxZoom: 2,
      zoomControl: true,
      attributionControl: false,
    });

    // Add floor plan image overlay
    L.imageOverlay(floorPlan.image_url, bounds).addTo(map);

    // Fit map to bounds
    map.fitBounds(bounds);

    // Create layer groups
    const layers = {
      edges: L.layerGroup().addTo(map),
      nodes: L.layerGroup().addTo(map),
      pois: L.layerGroup().addTo(map),
      route: L.layerGroup().addTo(map),
    };

    setLayerGroups(layers);

    // Handle map clicks
    if (onMapClick) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        // Convert Leaflet coordinates back to pixel coordinates
        const x = lng;
        const y = floorPlan.image_height - lat;
        onMapClick(x, y);
      });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [floorPlan, onMapClick]);

  // Render edges
  useEffect(() => {
    if (!layerGroups || !showEdges) return;

    layerGroups.edges.clearLayers();

    floorPlan.edges.forEach((edge) => {
      const sourceNode = floorPlan.nodes.find((n) => n.id === edge.source_node_id);
      const targetNode = floorPlan.nodes.find((n) => n.id === edge.target_node_id);

      if (sourceNode && targetNode) {
        const start = pixelToLeaflet(sourceNode.x, sourceNode.y, floorPlan.image_height);
        const end = pixelToLeaflet(targetNode.x, targetNode.y, floorPlan.image_height);

        const line = L.polyline([[start.lat, start.lng], [end.lat, end.lng]], {
          color: edge.accessible ? '#3b82f6' : '#9ca3af',
          weight: 2,
          opacity: 0.6,
          dashArray: edge.edge_type === 'stairs' ? '5, 5' : undefined,
        });

        line.addTo(layerGroups.edges);
      }
    });
  }, [floorPlan, layerGroups, showEdges]);

  // Render nodes
  useEffect(() => {
    if (!layerGroups || !showNodes) return;

    layerGroups.nodes.clearLayers();

    floorPlan.nodes.forEach((node) => {
      const coords = pixelToLeaflet(node.x, node.y, floorPlan.image_height);

      const color =
        node.node_type === 'entrance' ? '#10b981' :
        node.node_type === 'exit' ? '#ef4444' :
        node.node_type === 'stairs' ? '#f59e0b' :
        node.node_type === 'elevator' ? '#8b5cf6' :
        '#6b7280';

      const marker = L.circleMarker([coords.lat, coords.lng], {
        radius: 6,
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      });

      if (node.name) {
        marker.bindPopup(`<b>${node.name}</b><br>Type: ${node.node_type}`);
      }

      marker.addTo(layerGroups.nodes);
    });
  }, [floorPlan, layerGroups, showNodes]);

  // Render POIs
  useEffect(() => {
    if (!layerGroups || !showPOIs) return;

    layerGroups.pois.clearLayers();

    floorPlan.pois.forEach((poi) => {
      const coords = pixelToLeaflet(poi.x, poi.y, floorPlan.image_height);

      // Create custom icon for POI
      const icon = L.divIcon({
        className: 'custom-poi-marker',
        html: `<div style="
          background-color: #ef4444;
          border: 2px solid white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">📍</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([coords.lat, coords.lng], { icon });

      const popupContent = `
        <div style="min-width: 150px;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold;">${poi.name}</h3>
          ${poi.description ? `<p style="margin: 0 0 4px 0;">${poi.description}</p>` : ''}
          ${poi.category ? `<p style="margin: 0; color: #666; font-size: 12px;">Category: ${poi.category}</p>` : ''}
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.addTo(layerGroups.pois);
    });
  }, [floorPlan, layerGroups, showPOIs]);

  // Render route
  useEffect(() => {
    if (!layerGroups || !route || !route.success) return;

    layerGroups.route.clearLayers();

    // Convert route coordinates to Leaflet coordinates
    const leafletCoords = route.coordinates.map((coord: Coordinate) =>
      pixelToLeaflet(coord.x, coord.y, floorPlan.image_height)
    );

    // Draw route path
    const routeLine = L.polyline(
      leafletCoords.map((c) => [c.lat, c.lng]),
      {
        color: '#10b981',
        weight: 4,
        opacity: 0.8,
      }
    );

    routeLine.addTo(layerGroups.route);

    // Add start marker
    if (leafletCoords.length > 0) {
      const start = leafletCoords[0];
      L.circleMarker([start.lat, start.lng], {
        radius: 8,
        fillColor: '#10b981',
        color: '#ffffff',
        weight: 3,
        fillOpacity: 1,
      })
        .bindPopup('<b>Start</b>')
        .addTo(layerGroups.route);
    }

    // Add end marker
    if (leafletCoords.length > 1) {
      const end = leafletCoords[leafletCoords.length - 1];
      L.circleMarker([end.lat, end.lng], {
        radius: 8,
        fillColor: '#ef4444',
        color: '#ffffff',
        weight: 3,
        fillOpacity: 1,
      })
        .bindPopup('<b>Destination</b>')
        .addTo(layerGroups.route);
    }

    // Fit map to route bounds
    if (mapRef.current && leafletCoords.length > 0) {
      const bounds = L.latLngBounds(leafletCoords.map((c) => [c.lat, c.lng]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [route, layerGroups, floorPlan]);

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '500px',
      }}
    />
  );
};

export default FloorPlanMap;
