import React, { useState } from 'react';
import { floorPlanAnalysisApi, nodeApi, edgeApi } from '../../lib/api';
import { Venue, Node } from '../../types';
import { Wand2, Loader2, PlayCircle, Info, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutoGraphGeneratorProps {
    venue: Venue;
    onGraphGenerated: (nodes: Node[]) => void;
}

export const AutoGraphGenerator: React.FC<AutoGraphGeneratorProps> = ({ venue, onGraphGenerated }) => {
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<any>(null);

    const handleAutoDetect = async () => {
        if (!venue.mapImageUrl) {
            setError('No floor plan image available for this venue.');
            return;
        }

        try {
            setAnalyzing(true);
            setError(null);
            setResult(null);

            // Convert the map URL to a full path for the backend if needed
            // Logic from original admin.tsx
            let imagePath: string;
            if (venue.mapImageUrl.startsWith('/demo/')) {
                imagePath = `/Users/hakanyuzbasioglu/NavIO/backend/public${venue.mapImageUrl}`;
            } else if (venue.mapImageUrl.startsWith('/uploads/')) {
                imagePath = `/Users/hakanyuzbasioglu/NavIO/backend-node${venue.mapImageUrl}`;
            } else {
                imagePath = venue.mapImageUrl;
            }

            console.log('Generating navigation graph for floor plan:', imagePath);

            // 1. Generate graph from image
            const analysisResult = await floorPlanAnalysisApi.generateNavigationGraphFromPath(imagePath, 20);

            if (analysisResult.nodes && analysisResult.nodes.length > 0) {
                // 2. Process nodes
                const boothNodes = analysisResult.nodes.filter((n: any) => n.navNodeType === 'booth');
                const corridorNodes = analysisResult.nodes.filter((n: any) => n.navNodeType === 'waypoint');

                const createdNodes: Node[] = [];
                const nodeIdMap = new Map<number, string>();

                // Create booths
                for (const navNode of boothNodes) {
                    try {
                        const node = await nodeApi.create({
                            venueId: venue.id,
                            name: navNode.boothName || navNode.name,
                            type: 'booth',
                            x: navNode.x,
                            y: navNode.y,
                        });
                        createdNodes.push(node);
                        nodeIdMap.set(navNode.navNodeId, node.id);
                    } catch (e) {
                        console.error("Error creating booth node", e);
                    }
                }

                // Create waypoints
                for (const navNode of corridorNodes) {
                    try {
                        const node = await nodeApi.create({
                            venueId: venue.id,
                            name: `Waypoint ${navNode.navNodeId}`,
                            type: 'intersection',
                            x: navNode.x,
                            y: navNode.y,
                        });
                        createdNodes.push(node);
                        nodeIdMap.set(navNode.navNodeId, node.id);
                    } catch (e) {
                        console.error("Error creating waypoint node", e);
                    }
                }

                // 3. Process Edges
                let edgesCreated = 0;
                for (const navEdge of analysisResult.edges) {
                    const fromNodeId = nodeIdMap.get(navEdge.fromNodeIndex);
                    const toNodeId = nodeIdMap.get(navEdge.toNodeIndex);

                    if (fromNodeId && toNodeId) {
                        try {
                            await edgeApi.create({
                                venueId: venue.id,
                                fromNodeId,
                                toNodeId,
                                distance: navEdge.distance
                            });
                            edgesCreated++;
                        } catch (e) {
                            // Ignore duplicates
                        }
                    }
                }

                setResult({
                    boothCount: boothNodes.length,
                    waypointCount: corridorNodes.length,
                    edgeCount: edgesCreated
                });

                onGraphGenerated(createdNodes);
            } else {
                setError("No navigable areas detected.");
            }

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Analysis failed');
        } finally {
            setAnalyzing(false);
        }
    };

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const imageUrl = venue.mapImageUrl?.startsWith('http')
        ? venue.mapImageUrl
        : `${API_URL}${venue.mapImageUrl}`;

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                        <Wand2 size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-lg">Auto-Generate Graph</h3>
                        <p className="text-slate-500 text-sm">Automatically detect booths and walkable paths</p>
                    </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                    <div className="flex gap-3">
                        <Info className="text-blue-500 shrink-0" size={20} />
                        <div className="space-y-2 text-sm text-slate-600">
                            <p>Our algorithms will analyze your floor plan image to create a full navigation graph.</p>
                            <ul className="list-disc list-inside space-y-1 ml-1 text-slate-500 text-sm">
                                <li>Identifies <strong>white rectangles</strong> as booths (destinations)</li>
                                <li>Identifies <strong>corridors</strong> as walkable paths</li>
                                <li>Automatically connects all reachable areas</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {venue.mapImageUrl ? (
                    <div className="space-y-6">
                        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video flex items-center justify-center">
                            <img
                                src={imageUrl}
                                alt="Floor Plan"
                                className="max-w-full max-h-full object-contain"
                                onError={(e) => {
                                    // Fallback
                                    (e.target as HTMLImageElement).src = venue.mapImageUrl || '';
                                }}
                            />

                            {result && (
                                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center">
                                    <div className="text-center space-y-3 p-6">
                                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                                            <CheckCircle2 size={32} />
                                        </div>
                                        <h4 className="font-bold text-green-700 text-xl">Analysis Complete!</h4>
                                        <div className="grid grid-cols-3 gap-4 text-center">
                                            <div className="bg-white p-3 rounded-lg border border-green-100 shadow-sm">
                                                <div className="text-2xl font-bold text-slate-900">{result.boothCount}</div>
                                                <div className="text-xs text-slate-500 uppercase font-semibold">Booths</div>
                                            </div>
                                            <div className="bg-white p-3 rounded-lg border border-green-100 shadow-sm">
                                                <div className="text-2xl font-bold text-slate-900">{result.waypointCount}</div>
                                                <div className="text-xs text-slate-500 uppercase font-semibold">Waypoints</div>
                                            </div>
                                            <div className="bg-white p-3 rounded-lg border border-green-100 shadow-sm">
                                                <div className="text-2xl font-bold text-slate-900">{result.edgeCount}</div>
                                                <div className="text-xs text-slate-500 uppercase font-semibold">Edges</div>
                                            </div>
                                        </div>
                                        <button onClick={() => setResult(null)} className="text-sm text-slate-500 hover:text-slate-900 underline">
                                            View Image
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-center">
                            <button
                                onClick={handleAutoDetect}
                                disabled={analyzing || !!result}
                                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {analyzing ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        Analyzing Geometry...
                                    </>
                                ) : (
                                    <>
                                        <PlayCircle size={20} />
                                        Start Auto-Generation
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                        <p className="text-slate-500">Please upload a floor plan image in Venue Settings first.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
