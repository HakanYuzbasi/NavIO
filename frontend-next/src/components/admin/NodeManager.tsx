import React, { useState } from 'react';
import { nodeApi } from '../../lib/api';
import { Node, NodeType } from '../../types';
import { MapPin, Trash2, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NodeManagerProps {
    venueId: string;
    nodes: Node[];
    onNodeCreated: (node: Node) => void;
    onNodeDeleted: (nodeId: string) => void;
}

export const NodeManager: React.FC<NodeManagerProps> = ({
    venueId,
    nodes,
    onNodeCreated,
    onNodeDeleted
}) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<NodeType>('booth');
    const [x, setX] = useState('');
    const [y, setY] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const node = await nodeApi.create({
                venueId,
                name,
                type,
                x: parseFloat(x),
                y: parseFloat(y),
            });
            onNodeCreated(node);
            setName('');
            setX('');
            setY('');
        } catch (err) {
            console.error(err);
            alert('Failed to create node');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (nodeId: string) => {
        if (!confirm('Delete this node?')) return;
        try {
            await nodeApi.delete(nodeId);
            onNodeDeleted(nodeId);
        } catch (err) {
            console.error(err);
            alert('Failed to delete node');
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Plus size={18} className="text-primary-600" />
                    Add Node
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow outline-none"
                                placeholder="e.g. Booth 101"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as NodeType)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                            >
                                <option value="booth">Booth</option>
                                <option value="entrance">Entrance</option>
                                <option value="intersection">Intersection</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">X Coordinate</label>
                            <input
                                type="number"
                                value={x}
                                onChange={(e) => setX(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow outline-none"
                                placeholder="0"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Y Coordinate</label>
                            <input
                                type="number"
                                value={y}
                                onChange={(e) => setY(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow outline-none"
                                placeholder="0"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn bg-slate-900 text-white hover:bg-slate-800 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : 'Create Node'}
                    </button>
                </form>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                        <MapPin size={18} className="text-slate-500" />
                        Nodes List
                    </h3>
                    <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full">
                        {nodes.length}
                    </span>
                </div>

                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                    {nodes.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-sm">
                            No nodes created yet.
                        </div>
                    ) : (
                        nodes.map((node) => (
                            <div key={node.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div>
                                    <p className="font-medium text-slate-900">{node.name}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className={cn(
                                            "text-xs px-2 py-0.5 rounded-full font-medium capitalize",
                                            node.type === 'booth' ? "bg-blue-100 text-blue-700" :
                                                node.type === 'entrance' ? "bg-green-100 text-green-700" :
                                                    "bg-slate-100 text-slate-700"
                                        )}>
                                            {node.type}
                                        </span>
                                        <span className="text-xs text-slate-500 font-mono">
                                            ({node.x}, {node.y})
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleDelete(node.id)}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete Node"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
