import React, { useState } from 'react';
import { edgeApi } from '../../lib/api';
import { Node, Edge } from '../../types';
import { Share2, Trash2, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EdgeManagerProps {
    venueId: string;
    nodes: Node[];
    edges: Edge[];
    onEdgeCreated: (edge: Edge) => void;
    onEdgeDeleted: (edgeId: string) => void;
}

export const EdgeManager: React.FC<EdgeManagerProps> = ({
    venueId,
    nodes,
    edges,
    onEdgeCreated,
    onEdgeDeleted
}) => {
    const [fromId, setFromId] = useState('');
    const [toId, setToId] = useState('');
    const [distance, setDistance] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (fromId === toId) {
            alert("Cannot create edge to same node");
            return;
        }

        try {
            setLoading(true);
            const edge = await edgeApi.create({
                venueId,
                fromNodeId: fromId,
                toNodeId: toId,
                distance: parseFloat(distance),
            });
            onEdgeCreated(edge);
            setFromId('');
            setToId('');
            setDistance('');
        } catch (err) {
            console.error(err);
            alert('Failed to create edge');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (edgeId: string) => {
        if (!confirm('Delete this edge?')) return;
        try {
            await edgeApi.delete(edgeId);
            onEdgeDeleted(edgeId);
        } catch (err) {
            console.error(err);
            alert('Failed to delete edge');
        }
    };

    // Helper to calculate distance
    const calculateDistance = () => {
        if (fromId && toId) {
            const fromNode = nodes.find(n => n.id === fromId);
            const toNode = nodes.find(n => n.id === toId);
            if (fromNode && toNode) {
                const dx = fromNode.x - toNode.x;
                const dy = fromNode.y - toNode.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                setDistance(dist.toFixed(2));
            }
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Plus size={18} className="text-primary-600" />
                    Add Connection (Edge)
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">From Node</label>
                            <select
                                value={fromId}
                                onChange={(e) => setFromId(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                                required
                            >
                                <option value="">Select Node</option>
                                {nodes.map(node => (
                                    <option key={node.id} value={node.id}>{node.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">To Node</label>
                            <select
                                value={toId}
                                onChange={(e) => setToId(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                                required
                            >
                                <option value="">Select Node</option>
                                {nodes.map(node => (
                                    <option key={node.id} value={node.id}>{node.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="relative">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Distance (m)</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={distance}
                                    onChange={(e) => setDistance(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="0.00"
                                    step="0.01"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={calculateDistance}
                                    disabled={!fromId || !toId}
                                    className="text-xs px-2 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 disabled:opacity-50"
                                    title="Auto-calculate distance"
                                >
                                    Auto
                                </button>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn bg-slate-900 text-white hover:bg-slate-800 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : 'Create Connection'}
                    </button>
                </form>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                        <Share2 size={18} className="text-slate-500" />
                        Connections List
                    </h3>
                    <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full">
                        {edges.length}
                    </span>
                </div>

                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                    {edges.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-sm">
                            No connections created yet.
                        </div>
                    ) : (
                        edges.map((edge) => {
                            const fromNode = nodes.find(n => n.id === edge.fromNodeId);
                            const toNode = nodes.find(n => n.id === edge.toNodeId);

                            return (
                                <div key={edge.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div>
                                        <div className="flex items-center gap-2 font-medium text-slate-900">
                                            <span>{fromNode?.name || 'Unknown'}</span>
                                            <span className="text-slate-400">→</span>
                                            <span>{toNode?.name || 'Unknown'}</span>
                                        </div>
                                        <p className="text-sm text-slate-500 mt-1">
                                            Distance: {edge.distance}m
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => handleDelete(edge.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete Edge"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};
