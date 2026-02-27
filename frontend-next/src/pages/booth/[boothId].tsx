/**
 * Unified Booth Page
 * Single QR code destination: shows booth info, navigation link, and queue join
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { nodeApi, queueApi, QueueEntry } from '@/lib/api';
import { Node } from '@/types';
import {
  MapPin, Users, Clock, CheckCircle, Bell, Navigation, ArrowRight,
} from 'lucide-react';

export default function BoothPage() {
  const router = useRouter();
  const { boothId } = router.query;

  // Booth info
  const [booth, setBooth] = useState<Node | null>(null);
  const [boothLoading, setBoothLoading] = useState(true);
  const [boothError, setBoothError] = useState('');

  // Queue state
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [entry, setEntry] = useState<QueueEntry | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [estimatedWait, setEstimatedWait] = useState(0);
  const [queueDepth, setQueueDepth] = useState<number | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  // Load booth info
  useEffect(() => {
    if (!boothId || typeof boothId !== 'string') return;
    (async () => {
      try {
        setBoothLoading(true);
        const node = await nodeApi.getById(boothId);
        setBooth(node);
        // Also load queue status
        const status = await queueApi.getStatus(boothId);
        setQueueDepth(status.queueDepth);
      } catch (err: any) {
        setBoothError(err.message || 'Booth not found');
      } finally {
        setBoothLoading(false);
      }
    })();
  }, [boothId]);

  // Poll queue status after joining
  const pollStatus = useCallback(async () => {
    if (!entry) return;
    try {
      const updated = await queueApi.getEntry(entry.id);
      setEntry(updated);
      setPosition(updated.currentPosition ?? null);

      if (updated.status === 'active' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification("It's your turn!", {
          body: `Please head to ${booth?.name || 'the booth'} now.`,
          icon: '/favicon.ico',
        });
      }
    } catch {
      // Silently handle poll errors
    }
  }, [entry, booth]);

  useEffect(() => {
    if (!entry) return;
    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, [entry, pollStatus]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boothId || typeof boothId !== 'string') return;

    setJoining(true);
    setError('');

    try {
      const result = await queueApi.join(boothId, {
        visitorName: visitorName || undefined,
        visitorPhone: visitorPhone || undefined,
      });
      setEntry(result.entry);
      setPosition(result.position);
      setEstimatedWait(result.estimatedWaitMinutes);
    } catch (err: any) {
      setError(err.message || 'Failed to join queue');
    } finally {
      setJoining(false);
    }
  };

  // Loading state
  if (!boothId || boothLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  // Error state
  if (boothError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center max-w-md">
          <MapPin size={48} className="mx-auto text-slate-300 mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Booth Not Found</h1>
          <p className="text-slate-500">{boothError}</p>
        </div>
      </div>
    );
  }

  const boothName = booth?.name || 'Booth';

  // Queue status view (after joining)
  if (entry) {
    const isActive = entry.status === 'active';
    const isDone = entry.status === 'done';
    const isAlmostUp = position !== null && position <= 2 && !isActive && !isDone;

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <Head>
          <title>{boothName} - Queue Status</title>
        </Head>

        <div className="w-full max-w-md space-y-6">
          {/* Booth Header */}
          <div className="text-center">
            <h2 className="text-lg font-semibold text-slate-500">{boothName}</h2>
          </div>

          {/* Status Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center space-y-4">
            {isActive ? (
              <>
                <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle size={32} className="text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-green-700">It&apos;s Your Turn!</h1>
                <p className="text-slate-600">Please head to {boothName} now.</p>
              </>
            ) : isDone ? (
              <>
                <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center">
                  <CheckCircle size={32} className="text-slate-400" />
                </div>
                <h1 className="text-2xl font-bold text-slate-700">Visit Complete</h1>
                <p className="text-slate-500">Thank you for visiting {boothName}!</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto bg-indigo-100 rounded-full flex items-center justify-center">
                  <Users size={32} className="text-indigo-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">You&apos;re in the Queue</h1>

                <div className="bg-indigo-50 rounded-xl p-6">
                  <div className="text-5xl font-black text-indigo-600">
                    #{position ?? '—'}
                  </div>
                  <div className="text-sm text-indigo-500 mt-1 font-medium">Your Position</div>
                </div>

                <div className="flex items-center justify-center gap-2 text-slate-500">
                  <Clock size={16} />
                  <span>~{estimatedWait} min estimated wait</span>
                </div>
              </>
            )}
          </div>

          {/* Almost-up alert */}
          {isAlmostUp && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 text-center animate-pulse">
              <div className="flex items-center justify-center gap-2 text-amber-700 font-bold text-lg">
                <Bell size={20} />
                You&apos;re next!
              </div>
              <p className="text-amber-600 mt-1 text-sm">
                Please make your way to {boothName}
              </p>
            </div>
          )}

          {/* Navigate to booth link */}
          {booth && !isActive && !isDone && (
            <Link
              href={`/venue/${booth.venueId}?node=${booth.id}`}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl text-indigo-600 font-medium hover:bg-indigo-50 transition-colors shadow-sm"
            >
              <Navigation size={18} />
              Get Directions to {boothName}
              <ArrowRight size={16} />
            </Link>
          )}

          {entry.visitorName && (
            <p className="text-center text-slate-400 text-sm">
              Name: {entry.visitorName}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Main booth page (before joining queue)
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <Head>
        <title>{boothName} - NaviO</title>
      </Head>

      <div className="w-full max-w-md space-y-6">
        {/* Booth Info Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-indigo-100 rounded-full flex items-center justify-center">
            <MapPin size={32} className="text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{boothName}</h1>

          {booth && (
            <Link
              href={`/venue/${booth.venueId}?node=${booth.id}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-medium hover:bg-indigo-100 transition-colors"
            >
              <Navigation size={18} />
              Get Directions
              <ArrowRight size={16} />
            </Link>
          )}
        </div>

        {/* Queue Status */}
        {queueDepth !== null && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-1">
              <Users size={20} className="text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">Queue</h2>
            </div>
            <p className="text-slate-500 text-sm mb-4">
              {queueDepth === 0
                ? 'No one in line — join now!'
                : `${queueDepth} ${queueDepth === 1 ? 'person' : 'people'} waiting`}
            </p>

            {/* Join Form */}
            <form onSubmit={handleJoin} className="space-y-3">
              <input
                type="text"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                placeholder="Your name (optional)"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
              <input
                type="tel"
                value={visitorPhone}
                onChange={(e) => setVisitorPhone(e.target.value)}
                placeholder="Phone number (optional)"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />

              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={joining}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {joining ? (
                  'Joining...'
                ) : (
                  <>
                    <Users size={18} />
                    Join Queue
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
