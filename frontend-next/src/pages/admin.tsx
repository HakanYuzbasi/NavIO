import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Venue, Node, Edge } from '../types';
import { venueApi, nodeApi, edgeApi } from '../lib/api';
import Layout from '../components/Layout';
import { VenueList } from '../components/admin/VenueList';
import { VenueForm } from '../components/admin/VenueForm';
import { NodeManager } from '../components/admin/NodeManager';
import { EdgeManager } from '../components/admin/EdgeManager';
import { QRGenerator } from '../components/admin/QRGenerator';
import { AutoGraphGenerator } from '../components/admin/AutoGraphGenerator';
import { Settings, Map, Share2, QrCode, Wand2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'nodes' | 'edges' | 'qr' | 'analyze'>('nodes');

  useEffect(() => {
    loadVenues();
  }, []);

  useEffect(() => {
    if (selectedVenue) {
      loadVenueData(selectedVenue.id);
    }
  }, [selectedVenue]);

  const loadVenues = async () => {
    try {
      const data = await venueApi.getAll();
      setVenues(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadVenueData = async (venueId: string) => {
    try {
      setLoading(true);
      const [nodesData, edgesData] = await Promise.all([
        nodeApi.getAll(venueId),
        edgeApi.getAll(venueId),
      ]);
      setNodes(nodesData);
      setEdges(edgesData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVenueCreated = (venue: Venue) => {
    setVenues([...venues, venue]);
    setSelectedVenue(venue);
  };

  const handleViewVenue = (venue: Venue) => {
    router.push(`/venue/${venue.id}`);
  };

  // Node handlers
  const handleNodeCreated = (node: Node) => {
    setNodes([...nodes, node]);
  };

  const handleNodeDeleted = (nodeId: string) => {
    setNodes(nodes.filter(n => n.id !== nodeId));
    // Also remove connected edges
    setEdges(edges.filter(e => e.fromNodeId !== nodeId && e.toNodeId !== nodeId));
  };

  // Edge handlers
  const handleEdgeCreated = (edge: Edge) => {
    setEdges([...edges, edge]);
  };

  const handleEdgeDeleted = (edgeId: string) => {
    setEdges(edges.filter(e => e.id !== edgeId));
  };

  // Graph generated handler
  const handleGraphGenerated = (newNodes: Node[]) => {
    // Refresh all data
    if (selectedVenue) {
      loadVenueData(selectedVenue.id);
    }
  };

  return (
    <Layout>
      <Head>
        <title>Admin Panel - NaviO</title>
      </Head>

      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Dashboard</h1>
            <p className="text-slate-500 mt-1">Manage venues, navigation graphs, and QR codes.</p>
          </div>
        </header>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between shadow-sm">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Sidebar: Venue List & Create */}
          <div className="lg:col-span-4 space-y-6 sticky top-24">
            <VenueList
              venues={venues}
              selectedVenueId={selectedVenue?.id}
              onSelect={setSelectedVenue}
              onView={handleViewVenue}
            />
            <VenueForm onVenueCreated={handleVenueCreated} />
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-8">
            {!selectedVenue ? (
              <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center h-[500px] flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <Settings className="text-slate-300" size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">No Venue Selected</h3>
                <p className="text-slate-500 mt-2 max-w-sm mx-auto">
                  Select an existing venue from the sidebar or creating a new one to manage its navigation graph.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{selectedVenue.name}</h2>
                    <div className="flex gap-4 mt-1 text-sm text-slate-500">
                      <span>{nodes.length} Nodes</span>
                      <span>•</span>
                      <span>{edges.length} Connections</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewVenue(selectedVenue)}
                      className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
                    >
                      <Share2 size={16} />
                      View Live Venue
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 space-x-1 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('nodes')}
                    className={cn(
                      "px-6 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap",
                      activeTab === 'nodes' ? "border-primary-600 text-primary-600" : "border-transparent text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <Map size={16} />
                    Nodes
                  </button>
                  <button
                    onClick={() => setActiveTab('edges')}
                    className={cn(
                      "px-6 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap",
                      activeTab === 'edges' ? "border-primary-600 text-primary-600" : "border-transparent text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <Share2 size={16} />
                    Connections
                  </button>
                  <button
                    onClick={() => setActiveTab('qr')}
                    className={cn(
                      "px-6 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap",
                      activeTab === 'qr' ? "border-primary-600 text-primary-600" : "border-transparent text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <QrCode size={16} />
                    QR Codes
                  </button>
                  <button
                    onClick={() => setActiveTab('analyze')}
                    className={cn(
                      "px-6 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap",
                      activeTab === 'analyze' ? "border-indigo-600 text-indigo-600 bg-indigo-50/50" : "border-transparent text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <Wand2 size={16} />
                    Auto-Generate
                  </button>
                </div>

                {/* Tab Content */}
                <div className="min-h-[400px]">
                  {activeTab === 'nodes' && (
                    <NodeManager
                      venueId={selectedVenue.id}
                      nodes={nodes}
                      onNodeCreated={handleNodeCreated}
                      onNodeDeleted={handleNodeDeleted}
                    />
                  )}
                  {activeTab === 'edges' && (
                    <EdgeManager
                      venueId={selectedVenue.id}
                      nodes={nodes}
                      edges={edges}
                      onEdgeCreated={handleEdgeCreated}
                      onEdgeDeleted={handleEdgeDeleted}
                    />
                  )}
                  {activeTab === 'qr' && (
                    <QRGenerator
                      venueId={selectedVenue.id}
                      nodes={nodes}
                    />
                  )}
                  {activeTab === 'analyze' && (
                    <AutoGraphGenerator
                      venue={selectedVenue}
                      onGraphGenerated={handleGraphGenerated}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
