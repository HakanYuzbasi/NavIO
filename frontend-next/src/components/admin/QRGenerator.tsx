import React, { useState } from 'react';
import { qrApi } from '../../lib/api';
import { QrCode, Loader2, Printer, Info } from 'lucide-react';
import { Node } from '../../types';

interface QRGeneratorProps {
    venueId: string;
    nodes: Node[];
}

export const QRGenerator: React.FC<QRGeneratorProps> = ({ venueId, nodes }) => {
    const [loading, setLoading] = useState(false);
    const [generatedCount, setGeneratedCount] = useState<number | null>(null);

    const handleGenerate = async () => {
        try {
            setLoading(true);
            const result = await qrApi.generateForVenue(venueId);
            setGeneratedCount(result.count);
        } catch (err) {
            console.error(err);
            alert('Failed to generate QR codes');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                        <QrCode size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-lg">QR Code Generation</h3>
                        <p className="text-slate-500 text-sm">Generate location markers for your venue</p>
                    </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                    <div className="flex gap-3">
                        <Info className="text-blue-500 shrink-0" size={20} />
                        <div className="space-y-2 text-sm text-slate-600">
                            <p>This will generate unique QR codes for every node in your venue.</p>
                            <ul className="list-disc list-inside space-y-1 ml-1">
                                <li>Print these codes and place them at physical locations.</li>
                                <li>Visitors scan them to instantly set their "Start" location.</li>
                                <li>QR codes link to: <code className="bg-white px-1 py-0.5 rounded border border-slate-200 text-xs">/venue/{venueId}?node=NODE_ID</code></li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    {generatedCount !== null ? (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                <Printer size={32} />
                            </div>
                            <h4 className="font-bold text-green-700 text-lg">Success!</h4>
                            <p className="text-slate-600">
                                Successfully generated <strong>{generatedCount}</strong> QR codes.
                            </p>
                            <p className="text-sm text-slate-500">
                                Check the backend `public/qrcodes` folder to retrieve them.
                            </p>

                            <button
                                onClick={() => setGeneratedCount(null)}
                                className="mt-4 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 font-medium"
                            >
                                Generate Again
                            </button>
                        </div>
                    ) : (
                        <div className="text-center space-y-4">
                            <p className="text-slate-600 max-w-sm mx-auto">
                                Ready to generate QR codes for {nodes.length} nodes?
                            </p>
                            <button
                                onClick={handleGenerate}
                                disabled={loading || nodes.length === 0}
                                className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-lg hover:shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Printer size={20} />
                                        Generate Codes
                                    </>
                                )}
                            </button>
                            {nodes.length === 0 && (
                                <p className="text-xs text-red-500 font-medium">Add nodes first to generate QR codes</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
