import React from 'react';
import { Venue } from '../../types';
import { Map, ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VenueListProps {
    venues: Venue[];
    selectedVenueId?: string;
    onSelect: (venue: Venue) => void;
    onView: (venue: Venue) => void;
}

export const VenueList: React.FC<VenueListProps> = ({
    venues,
    selectedVenueId,
    onSelect,
    onView
}) => {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Map size={18} className="text-slate-500" />
                    Venues
                </h2>
                <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full">
                    {venues.length}
                </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                {venues.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                        No venues found. Create one to get started.
                    </div>
                ) : (
                    venues.map((venue) => (
                        <div
                            key={venue.id}
                            onClick={() => onSelect(venue)}
                            className={cn(
                                "p-4 flex items-center justify-between cursor-pointer transition-colors hover:bg-slate-50",
                                selectedVenueId === venue.id ? "bg-primary-50 hover:bg-primary-50 border-l-4 border-l-primary-500" : "border-l-4 border-l-transparent"
                            )}
                        >
                            <div className="flex-1 min-w-0">
                                <p className={cn(
                                    "font-medium truncate",
                                    selectedVenueId === venue.id ? "text-primary-900" : "text-slate-900"
                                )}>
                                    {venue.name}
                                </p>
                                {venue.width && (
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {venue.width} × {venue.height}
                                    </p>
                                )}
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onView(venue);
                                }}
                                className="p-2 text-slate-400 hover:text-primary-600 hover:bg-white rounded-lg transition-colors ml-2"
                                title="View Venue"
                            >
                                <ExternalLink size={16} />
                            </button>

                            <ChevronRight
                                size={16}
                                className={cn(
                                    "ml-1 transition-transform",
                                    selectedVenueId === venue.id ? "text-primary-400" : "text-slate-300"
                                )}
                            />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
