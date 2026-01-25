import React, { useState, useRef } from 'react';
import { venueApi, uploadApi } from '../../lib/api';
import { Venue } from '../../types';
import { Plus, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VenueFormProps {
    onVenueCreated: (venue: Venue) => void;
}

export const VenueForm: React.FC<VenueFormProps> = ({ onVenueCreated }) => {
    const [name, setName] = useState('');
    const [mapUrl, setMapUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setMapUrl('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            let mapImageUrl = mapUrl || undefined;

            if (selectedFile) {
                setUploading(true);
                const uploadResult = await uploadApi.uploadFloorPlan(selectedFile);
                mapImageUrl = uploadResult.file.url;
                setUploading(false);
            }

            const venue = await venueApi.create({
                name,
                mapImageUrl,
            });

            onVenueCreated(venue);
            setName('');
            setMapUrl('');
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err) {
            console.error(err);
            alert('Failed to create venue');
        } finally {
            setLoading(false);
            setUploading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Plus size={18} className="text-primary-600" />
                Create New Venue
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Venue Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow outline-none"
                        placeholder="e.g. Main Hall"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Floor Plan</label>

                    <div className="space-y-3">
                        {/* File Upload Option */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                                "border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer transition-colors hover:bg-slate-50 hover:border-primary-400 group",
                                selectedFile && "border-primary-500 bg-primary-50/50"
                            )}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <div className="flex flex-col items-center gap-2">
                                {selectedFile ? (
                                    <>
                                        <ImageIcon className="text-primary-600" size={24} />
                                        <span className="text-sm font-medium text-primary-700 truncate max-w-full px-2">{selectedFile.name}</span>
                                        <span className="text-xs text-primary-500">Click to change</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="text-slate-400 group-hover:text-primary-500 transition-colors" size={24} />
                                        <span className="text-sm text-slate-600 group-hover:text-primary-600">Upload image file</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-slate-500">Or use demo</span>
                            </div>
                        </div>

                        <select
                            value={mapUrl}
                            onChange={(e) => {
                                setMapUrl(e.target.value);
                                setSelectedFile(null);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            disabled={!!selectedFile}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
                        >
                            <option value="">Select a demo plan...</option>
                            <option value="/demo/food-hall-floorplan.png">Food Hall Floor Plan</option>
                            <option value="/demo/complete_annotated_1.png">Annotated Plan 1</option>
                            <option value="/demo/complete_annotated_2.png">Annotated Plan 2</option>
                        </select>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading || uploading}
                    className="w-full btn bg-slate-900 text-white hover:bg-slate-800 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading || uploading ? (
                        <>
                            <Loader2 className="animate-spin" size={18} />
                            {uploading ? 'Uploading...' : 'Creating...'}
                        </>
                    ) : (
                        'Create Venue'
                    )}
                </button>
            </form>
        </div>
    );
};
