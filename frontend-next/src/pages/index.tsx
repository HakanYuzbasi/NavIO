/**
 * Home Page
 * Landing page with venue selection
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Venue } from '../types';
import { venueApi } from '../lib/api';
import Layout from '../components/Layout';
import { MapPin, Plus, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function HomePage() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVenues();
  }, []);

  const loadVenues = async () => {
    try {
      const data = await venueApi.getAll();
      setVenues(data);
    } catch (error) {
      console.error('Failed to load venues:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="NaviO - Dashboard">
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
              Welcome Back
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Select a venue to start navigating or manage your spaces.</p>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm hover:shadow-md font-medium"
          >
            <Plus size={18} />
            Create Venue
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : venues.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="text-slate-400 dark:text-slate-500" size={32} />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">No venues found</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1 mb-6">Get started by creating your first venue map.</p>
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors"
            >
              Create Venue
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {venues.map((venue, i) => (
              <motion.div
                key={venue.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => router.push(`/venue/${venue.id}`)}
                className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-xl hover:border-primary-200 dark:hover:border-primary-900 transition-all duration-300 cursor-pointer overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                  <Navigation size={64} className="text-primary-600" />
                </div>

                <div className="relative z-10">
                  <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-600 group-hover:text-white transition-colors duration-300">
                    <MapPin size={24} className="text-primary-600 dark:text-primary-400 group-hover:text-white transition-colors" />
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {venue.name}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 line-clamp-2">
                    Indoor navigation map for {venue.name}. Click to view details and start navigating.
                  </p>

                  <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-medium text-sm group-hover:translate-x-1 transition-transform">
                    Start Navigation <Navigation size={14} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

