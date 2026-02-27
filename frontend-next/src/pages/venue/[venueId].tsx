/**
 * Visitor Navigation Page
 * Main page for end users to navigate indoor venues
 * Shows clean step-by-step navigation like airport wayfinding
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import InteractiveMap from '../../components/InteractiveMap';
import QRScanner from '../../components/QRScanner';
import Layout from '../../components/Layout';
import { Node, Venue, Edge, RouteResponse } from '../../types';
import { venueApi, nodeApi, edgeApi, routingApi } from '../../lib/api';
import { QrCode, Search, Navigation, MapPin, X, ChevronRight, Clock, Info, Menu, CheckCircle2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TurnPoint {
  node: Node;
  type: 'start' | 'turn-left' | 'turn-right' | 'destination';
  instruction: string;
  stepNumber: number;
}

export default function VenueNavigationPage() {
  const router = useRouter();
  const { venueId, node: nodeIdFromQR } = router.query;

  const [venue, setVenue] = useState<Venue | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Node | null>(null);
  const [destination, setDestination] = useState<Node | null>(null);
  const [route, setRoute] = useState<RouteResponse | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showNodeSelector, setShowNodeSelector] = useState(false);
  const [selectorType, setSelectorType] = useState<'origin' | 'destination'>('destination');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (venueId && typeof venueId === 'string') {
      loadVenueData(venueId);
    }
  }, [venueId]);

  useEffect(() => {
    if (nodeIdFromQR && typeof nodeIdFromQR === 'string' && nodes.length > 0) {
      const node = nodes.find(n => n.id === nodeIdFromQR);
      if (node) {
        setCurrentLocation(node);
      }
    }
  }, [nodeIdFromQR, nodes]);

  const loadVenueData = async (id: string) => {
    try {
      setLoading(true);
      const [venueData, nodesData, edgesData] = await Promise.all([
        venueApi.getById(id),
        nodeApi.getAll(id),
        edgeApi.getAll(id),
      ]);

      setVenue(venueData);
      setNodes(nodesData);
      setEdges(edgesData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load venue data');
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = (data: string) => {
    try {
      // Parse QR code data (URL format: /venue/{venueId}?node={nodeId})
      const url = new URL(data, window.location.origin);
      const scannedNodeId = url.searchParams.get('node');

      if (scannedNodeId) {
        const node = nodes.find(n => n.id === scannedNodeId);
        if (node) {
          setCurrentLocation(node);
          setShowScanner(false);
        } else {
          setError('Invalid QR code - node not found');
        }
      }
    } catch (err) {
      setError('Invalid QR code format');
    }
  };

  const handleNodeSelect = (node: Node) => {
    if (selectorType === 'origin') {
      setCurrentLocation(node);
      if (destination) calculateRoute(node.id, destination.id);
    } else {
      setDestination(node);
      if (currentLocation) calculateRoute(currentLocation.id, node.id);
    }
    setShowNodeSelector(false);
    setSearchQuery('');
  };

  const calculateRoute = async (startId: string, endId: string) => {
    if (!venueId || typeof venueId !== 'string') return;

    try {
      setLoading(true);
      const routeData = await routingApi.calculateRoute({
        venueId: venueId,
        startNodeId: startId,
        endNodeId: endId,
      });

      setRoute(routeData);
      setError(null);
      setSidebarOpen(true); // Open sidebar/drawer on route calc
    } catch (err: any) {
      setError(err.message || 'Failed to calculate route');
      setRoute(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClearRoute = () => {
    setRoute(null);
    setDestination(null);
    setSidebarOpen(false);
  };

  // Only show booth nodes as selectable destinations (not corridor waypoints)
  // CRITICAL: Deduplicate by name - each booth may have multiple entrance nodes
  // (north, south, east, west entrances) but user should only see ONE entry per booth
  const selectableNodes = useMemo(() => {
    const boothAndEntranceNodes = nodes.filter(node => node.type === 'booth' || node.type === 'entrance');

    // Deduplicate by name - keep only one node per unique name
    const seenNames = new Set<string>();
    const uniqueNodes: Node[] = [];

    for (const node of boothAndEntranceNodes) {
      if (!seenNames.has(node.name)) {
        seenNames.add(node.name);
        uniqueNodes.push(node);
      }
    }

    return uniqueNodes;
  }, [nodes]);

  const filteredNodes = selectableNodes.filter(node =>
    node.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate turn points from the route path with distances and enhanced logic
  const turnPoints = useMemo((): TurnPoint[] => {
    if (!route?.path || route.path.length < 2 || !currentLocation || !destination) {
      return [];
    }

    // Filter out synthetic orthogonal intermediates (L-bend waypoints) so turn
    // detection only fires at real navigation decision points, not at every bend
    const path = route.path.filter(n => !n.id.startsWith('ortho-'));
    const points: TurnPoint[] = [];
    let stepNumber = 1;

    const calculateDistance = (n1: Node, n2: Node) =>
      Math.sqrt(Math.pow(n2.x - n1.x, 2) + Math.pow(n2.y - n1.y, 2));

    const calculateAngle = (from: Node, to: Node): number => {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      return Math.atan2(dy, dx) * (180 / Math.PI);
    };

    const classifyTurn = (prevAngle: number, newAngle: number): 'turn-left' | 'turn-right' | null => {
      let angleDiff = newAngle - prevAngle;
      while (angleDiff > 180) angleDiff -= 360;
      while (angleDiff < -180) angleDiff += 360;
      if (Math.abs(angleDiff) < 35) return null; // Slightly more sensitive threshold
      return angleDiff > 0 ? 'turn-right' : 'turn-left';
    };

    // SOTA: Find nearby booth/landmark for a given turn point
    // This provides meaningful context instead of "Waypoint 24"
    const findNearbyLandmark = (turnNode: Node): string | null => {
      const MAX_LANDMARK_DISTANCE = 150; // Search within 150 units
      let nearestLandmark: { name: string; distance: number } | null = null;

      for (const node of nodes) {
        // Only consider booth nodes as landmarks (not waypoints)
        if (node.type !== 'booth') continue;
        // Skip the destination itself
        if (node.id === destination?.id) continue;

        const dx = node.x - turnNode.x;
        const dy = node.y - turnNode.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= MAX_LANDMARK_DISTANCE) {
          if (!nearestLandmark || distance < nearestLandmark.distance) {
            nearestLandmark = { name: node.name, distance };
          }
        }
      }

      return nearestLandmark?.name || null;
    };

    // Add start point
    points.push({
      node: path[0],
      type: 'start',
      instruction: `Start at ${currentLocation.name}`,
      stepNumber: stepNumber++,
    });

    let accumulatedDistance = 0;

    for (let i = 0; i < path.length - 1; i++) {
      const currentDistance = calculateDistance(path[i], path[i + 1]);
      accumulatedDistance += currentDistance;

      if (i > 0) {
        const prevAngle = calculateAngle(path[i - 1], path[i]);
        const currentAngle = calculateAngle(path[i], path[i + 1]);
        const turn = classifyTurn(prevAngle, currentAngle);

        if (turn) {
          const turnDirection = turn === 'turn-left' ? 'Turn left' : 'Turn right';

          // Find a meaningful landmark reference for this turn
          let locationHint = '';
          if (path[i].type === 'booth') {
            // If the turn is at a booth, use its name
            locationHint = ` at ${path[i].name}`;
          } else {
            // For waypoints, find the nearest booth as a landmark reference
            const nearbyLandmark = findNearbyLandmark(path[i]);
            if (nearbyLandmark) {
              locationHint = ` (near ${nearbyLandmark})`;
            }
          }

          const turnInstruction = `${turnDirection}${locationHint}`;

          points.push({
            node: path[i],
            type: turn,
            instruction: turnInstruction,
            stepNumber: stepNumber++,
          });

          accumulatedDistance = currentDistance; // Reset distance for the next segment
        }
      }
    }

    // Add destination point
    points.push({
      node: path[path.length - 1],
      type: 'destination',
      instruction: `Arrive at ${destination.name}`,
      stepNumber: stepNumber,
    });

    return points;
  }, [route, currentLocation, destination, nodes]);

  if (loading && !venue) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-medium">Loading venue...</p>
      </div>
    );
  }

  if (!venue) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="bg-red-50 p-4 rounded-full mb-4">
            <Info size={32} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Venue Not Found</h2>
          <p className="text-slate-500 mt-2">The venue you are looking for does not exist or has been removed.</p>
          <button
            onClick={() => router.push('/')}
            className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Return Home
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>{venue.name} - NaviO</title>
        <meta name="description" content={`Navigate ${venue.name}`} />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div className="relative h-[calc(100vh-64px)] overflow-hidden bg-slate-100 dark:bg-slate-900">

        {/* SOTA Sticky Navigation Header (Glassmorphism) */}
        {route && turnPoints.length > 0 && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[40] w-[90%] max-w-sm">
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-[2rem] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-5"
            >
              <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
                {turnPoints[activeStep]?.type === 'turn-left' ? (
                  <ChevronRight size={32} className="rotate-180 text-white" strokeWidth={3} />
                ) : turnPoints[activeStep]?.type === 'turn-right' ? (
                  <ChevronRight size={32} className="text-white" strokeWidth={3} />
                ) : turnPoints[activeStep]?.type === 'destination' ? (
                  <FlagIcon size={28} fill="white" className="text-white" />
                ) : (
                  <Navigation size={28} className="text-white animate-bounce" strokeWidth={3} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Next Step</p>
                <h2 className="text-white font-black text-lg leading-tight truncate">
                  {turnPoints[activeStep]?.instruction || 'Initializing...'}
                </h2>
              </div>
              <button
                onClick={() => setActiveStep((prev) => Math.min(prev + 1, turnPoints.length - 1))}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                title="Next turn"
              >
                <ChevronRight size={20} className="text-white" />
              </button>
            </motion.div>
          </div>
        )}

        {/* Map Container - Full Screen */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="w-full h-full"
        >
          <InteractiveMap
            venue={venue}
            nodes={nodes}
            edges={edges}
            route={route?.path}
            currentLocation={currentLocation || undefined}
            destination={destination || undefined}
            turnPoints={turnPoints.length > 0 ? turnPoints : undefined}
          />
        </motion.div>

        {/* Floating Action Dock (Bottom Right) */}
        <div className="absolute bottom-8 right-6 z-10 flex flex-col gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowScanner(true)}
            className="w-14 h-14 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-900/20 flex items-center justify-center hover:bg-slate-800 transition-colors"
            title="Scan QR Code"
          >
            <QrCode size={24} />
          </motion.button>

          {!sidebarOpen && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSidebarOpen(true)}
              className="w-14 h-14 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 flex items-center justify-center hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Menu size={24} />
            </motion.button>
          )}
        </div>

        {/* Glass Sidebar / Bottom Sheet */}
        <AnimatePresence>
          {(sidebarOpen || route || !currentLocation || !destination) && (
            <>
              {/* Mobile Backdrop for focus */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
                className="absolute inset-0 bg-black/5 z-20 sm:hidden block backdrop-blur-[1px]"
              />

              <motion.div
                className={cn(
                  "absolute z-30 overflow-hidden flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl border-slate-100 dark:border-slate-800",
                  // Mobile: Bottom Sheet style
                  "bottom-0 left-0 right-0 rounded-t-[2.5rem] max-h-[85vh]",
                  // Desktop: Floating sidebar style
                  "sm:top-4 sm:bottom-4 sm:left-4 sm:w-[380px] sm:rounded-3xl sm:border sm:max-h-[calc(100vh-32px)]"
                )}
                initial={{ y: "100%", x: 0 }}
                animate={{ y: 0, x: 0 }}
                exit={{ y: "110%", transition: { duration: 0.3 } }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
              >
                {/* Drag Handle for Mobile */}
                <div className="w-full h-6 flex items-center justify-center sm:hidden shrink-0" onClick={() => setSidebarOpen(false)}>
                  <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
                </div>

                <div className="px-6 pb-4 pt-2 border-b border-slate-100/50 dark:border-slate-800/50 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    {route ? 'Current Trip' : 'Plan Navigation'}
                  </h3>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors hidden sm:block"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
                  {error && (
                    <div className="p-4 bg-red-50/80 backdrop-blur-sm text-red-600 text-sm rounded-2xl flex items-start gap-3 border border-red-100">
                      <Info size={16} className="mt-0.5 shrink-0" />
                      <p className="font-medium">{error}</p>
                    </div>
                  )}

                  {/* Active Route View */}
                  {route && currentLocation && destination ? (
                    <div className="space-y-8">
                      {/* Trip Stats */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-4 rounded-2xl">
                          <div className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-1">Duration</div>
                          <div className="text-2xl font-black text-indigo-950 dark:text-white leading-none">{Math.ceil(route.estimatedTimeSeconds / 60)}<span className="text-xs font-bold ml-1 opacity-60">min</span></div>
                        </div>
                        <div className="bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl">
                          <div className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Distance</div>
                          <div className="text-2xl font-black text-slate-950 dark:text-white leading-none">{Math.round(route.totalDistance)}<span className="text-xs font-bold ml-1 opacity-60">m</span></div>
                        </div>
                      </div>

                      {/* Directions Timeline */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 pl-1">Directions</h4>
                        <div className="space-y-4 relative pl-4">
                          {/* Premium Vertical Progress Line */}
                          <div className="absolute left-[27px] top-6 bottom-6 w-[2px] bg-slate-100 dark:bg-slate-800" />
                          <div
                            className="absolute left-[27px] top-6 w-[2px] bg-indigo-500 transition-all duration-700 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                            style={{ height: `${(activeStep / Math.max(1, turnPoints.length - 1)) * 100}%` }}
                          />

                          {turnPoints.map((point, index) => (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.05 }}
                              key={index}
                              onClick={() => setActiveStep(index)}
                              className={cn(
                                "relative flex gap-4 p-4 rounded-2xl transition-all cursor-pointer group",
                                activeStep === index
                                  ? "bg-indigo-600 shadow-xl shadow-indigo-200/50 z-10 scale-[1.03]"
                                  : "hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-100"
                              )}
                            >
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-all ring-4 ring-white dark:ring-slate-900",
                                activeStep === index
                                  ? "bg-white text-indigo-600 shadow-lg"
                                  : index < activeStep
                                    ? "bg-green-500 text-white shadow-md shadow-green-200"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600"
                              )}>
                                {index < activeStep ? (
                                  <CheckCircle2 size={16} strokeWidth={3} />
                                ) : point.type === 'start' ? (
                                  <div className="w-2 h-2 bg-current rounded-full" />
                                ) : point.type === 'destination' ? (
                                  <FlagIcon size={14} fill="currentColor" />
                                ) : (
                                  <ChevronRight size={14} className={cn(point.type === 'turn-left' && "rotate-180")} strokeWidth={3} />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={cn(
                                  "font-black text-base leading-tight mb-1 transition-colors",
                                  activeStep === index ? "text-white" : "text-slate-900 dark:text-white"
                                )}>
                                  {point.instruction}
                                </p>
                                <p className={cn(
                                  "text-[11px] font-black uppercase tracking-[0.1em]",
                                  activeStep === index ? "text-white/70" : "text-slate-500 dark:text-slate-400"
                                )}>
                                  Step {index + 1}
                                </p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={handleClearRoute}
                        className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        End Navigation
                      </button>
                    </div>
                  ) : (
                    /* Setup View */
                    <div className="space-y-8">
                      {/* Input Fields */}
                      <div className="space-y-4">
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                            <MapPin size={16} fill="currentColor" className="text-green-600" />
                          </div>
                          {currentLocation ? (
                            <div className="w-full pl-14 pr-12 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                              <span className="truncate">{currentLocation.name}</span>
                              <button onClick={() => setCurrentLocation(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors"><X size={16} /></button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-[1fr,auto] gap-2">
                              <button
                                onClick={() => { setSelectorType('origin'); setShowNodeSelector(true); }}
                                className="w-full pl-14 pr-4 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-left text-slate-400 font-medium hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md transition-all truncate"
                              >
                                Where are you now?
                              </button>
                              <button
                                onClick={() => setShowScanner(true)}
                                className="w-14 h-full bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
                              >
                                <QrCode size={20} />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-center -my-2 relative z-10">
                          <div className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center border border-slate-200 text-slate-400 shadow-sm">
                            <div className="w-1 h-1 bg-slate-400 rounded-full box-content border-2 border-slate-50" />
                          </div>
                        </div>

                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                            <FlagIcon size={16} fill="currentColor" />
                          </div>
                          {destination ? (
                            <div className="w-full pl-14 pr-12 py-4 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-2xl font-semibold text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
                              <span className="truncate">{destination.name}</span>
                              <button onClick={() => { setDestination(null); setRoute(null); }} className="p-1 hover:bg-indigo-200/50 dark:hover:bg-indigo-800 rounded-full text-indigo-400 transition-colors"><X size={16} /></button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setSelectorType('destination'); setShowNodeSelector(true); }}
                              className="w-full pl-14 pr-4 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-left text-slate-400 font-medium hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md transition-all truncate"
                            >
                              Where do you want to go?
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Suggestions */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Suggested Destinations</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectableNodes.slice(0, 6).map((node, i) => (
                            <motion.button
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.05 }}
                              key={node.id}
                              onClick={() => {
                                setDestination(node);
                                if (currentLocation) {
                                  calculateRoute(currentLocation.id, node.id);
                                } else {
                                  // Prompt for origin if missing
                                  setSelectorType('origin');
                                  setShowNodeSelector(true);
                                }
                              }}
                              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 hover:border-indigo-600 hover:shadow-lg hover:shadow-indigo-200 dark:hover:shadow-indigo-900/40 transition-all"
                            >
                              {node.name}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Node Selector Modal - Full Screen Mobile, Centered Desktop */}
        <AnimatePresence>
          {showNodeSelector && (
            <div className="absolute inset-0 z-[50] flex items-end sm:items-center justify-center sm:p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
                onClick={() => setShowNodeSelector(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="bg-white dark:bg-slate-900 w-full max-w-lg h-[90%] sm:h-[600px] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col relative z-10 overflow-hidden"
              >
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
                  <Search className="text-indigo-600 dark:text-indigo-400" size={24} />
                  <input
                    type="text"
                    placeholder={`Search ${selectorType === 'origin' ? 'start point' : 'destination'}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 text-lg font-semibold placeholder:text-slate-300 dark:placeholder:text-slate-600 outline-none truncate bg-transparent text-slate-900 dark:text-white"
                    autoFocus
                  />
                  <button onClick={() => setShowNodeSelector(false)} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                    <X size={20} className="text-slate-500 dark:text-slate-400" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {filteredNodes.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <Search size={32} />
                      </div>
                      <p className="text-slate-500 font-medium">No locations found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredNodes.map((node, i) => (
                        <motion.button
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          key={node.id}
                          onClick={() => handleNodeSelect(node)}
                          className="w-full p-4 flex items-center gap-4 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 rounded-2xl transition-all group border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm">
                            {node.type === 'entrance' ? <MapPin size={20} /> : <StoreIcon size={20} />}
                          </div>
                          <div className="text-left flex-1 min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white text-lg leading-tight truncate">{node.name}</div>
                            <div className="text-sm text-slate-400 capitalize font-medium">{node.type}</div>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-300 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:border-indigo-200 dark:group-hover:border-indigo-800">
                            <ChevronRight size={16} />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* QR Scanner Modal */}
        {showScanner && (
          <QRScanner
            onScan={handleQRScan}
            onError={setError}
            onClose={() => setShowScanner(false)}
          />
        )}
      </div>
    </Layout>
  );
}

// Simple Icon Wrappers
// Simple Icon Wrappers
const FlagIcon = ({ size = 24, className, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
    <line x1="4" y1="22" x2="4" y2="15"></line>
  </svg>
);

const StoreIcon = ({ size = 24, className, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M3 3v18h18V3H3zM9 9h6v6H9V9z" />
  </svg>
);
