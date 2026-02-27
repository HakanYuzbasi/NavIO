/**
 * Queue Join Page
 * Visitors scan QR code at a booth and join the queue
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { queueApi, QueueEntry } from '@/lib/api';
import { Users, Clock, CheckCircle, Bell } from 'lucide-react';

export default function QueueJoinPage() {
  const router = useRouter();
  const { boothId } = router.query;

  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [entry, setEntry] = useState<QueueEntry | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [estimatedWait, setEstimatedWait] = useState<number>(0);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const pollStatus = useCallback(async () => {
    if (!entry) return;
    try {
      const updated = await queueApi.getEntry(entry.id);
      setEntry(updated);
      setPosition(updated.currentPosition ?? null);

      if (updated.status === 'active' || updated.status === 'done') {
        // Notify if browser supports it
        if (updated.status === 'active' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification("It's your turn!", {
            body: 'Please head to the booth now.',
            icon: '/favicon.ico',
          });
        }
      }
    } catch {
      // Silently handle poll errors
    }
  }, [entry]);

  useEffect(() => {
    if (!entry) return;
    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, [entry, pollStatus]);

  // Request notification permission on mount
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

  if (!boothId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  // Already joined — show status
  if (entry) {
    const isActive = entry.status === 'active';
    const isDone = entry.status === 'done';
    const isAlmostUp = position !== null && position <= 2 && !isActive && !isDone;

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center space-y-4">
            {isActive ? (
              <>
                <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle size={32} className="text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-green-700">It&apos;s Your Turn!</h1>
                <p className="text-slate-600">Please head to the booth now.</p>
              </>
            ) : isDone ? (
              <>
                <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center">
                  <CheckCircle size={32} className="text-slate-400" />
                </div>
                <h1 className="text-2xl font-bold text-slate-700">Visit Complete</h1>
                <p className="text-slate-500">Thank you for visiting!</p>
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
                You&apos;re Almost Up!
              </div>
              <p className="text-amber-600 mt-1 text-sm">
                Please head to the booth and get ready.
              </p>
            </div>
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

  // Join form
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto bg-indigo-100 rounded-full flex items-center justify-center">
              <Users size={28} className="text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Join the Queue</h1>
            <p className="text-slate-500 text-sm">Enter your details to reserve your spot</p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Name (optional)
              </label>
              <input
                type="text"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Phone (optional)
              </label>
              <input
                type="tel"
                value={visitorPhone}
                onChange={(e) => setVisitorPhone(e.target.value)}
                placeholder="Your phone number"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={joining}
              className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {joining ? 'Joining...' : 'Join Queue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
