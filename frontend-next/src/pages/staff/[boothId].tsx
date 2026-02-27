/**
 * Staff Queue Management Page
 * Staff view for managing booth visitor queues
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { queueApi, QueueEntry } from '@/lib/api';
import { Users, Play, CheckCircle, Clock, RefreshCw } from 'lucide-react';

export default function StaffQueuePage() {
  const router = useRouter();
  const { boothId } = router.query;

  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!boothId || typeof boothId !== 'string') return;
    try {
      const data = await queueApi.getEntries(boothId);
      setEntries(data);
    } catch (err) {
      console.error('Failed to refresh queue:', err);
    } finally {
      setLoading(false);
    }
  }, [boothId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleCallNext = async () => {
    if (!boothId || typeof boothId !== 'string') return;
    setActionLoading(true);
    try {
      await queueApi.callNext(boothId);
      await refresh();
    } catch (err) {
      console.error('Failed to call next:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!boothId || typeof boothId !== 'string') return;
    setActionLoading(true);
    try {
      await queueApi.complete(boothId);
      await refresh();
    } catch (err) {
      console.error('Failed to complete visit:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const activeEntry = entries.find(e => e.status === 'active');
  const waitingEntries = entries.filter(e => e.status === 'waiting');

  if (!boothId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Users size={28} />
              Queue Manager
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Booth: {typeof boothId === 'string' ? boothId.substring(0, 8) : ''}...
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Currently Serving */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Currently Serving</h2>
          {activeEntry ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Play size={18} className="text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-slate-900">
                    {activeEntry.visitorName || 'Anonymous'}
                  </div>
                  <div className="text-sm text-slate-500">
                    Called at {activeEntry.calledAt ? new Date(activeEntry.calledAt).toLocaleTimeString() : '—'}
                  </div>
                </div>
              </div>
              <button
                onClick={handleComplete}
                disabled={actionLoading}
                className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle size={16} />
                Complete
              </button>
            </div>
          ) : (
            <p className="text-slate-400 text-center py-4">No one currently being served</p>
          )}
        </div>

        {/* Action */}
        <button
          onClick={handleCallNext}
          disabled={actionLoading || waitingEntries.length === 0}
          className="w-full py-4 bg-indigo-600 text-white font-bold text-lg rounded-2xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Play size={20} />
          Call Next ({waitingEntries.length} waiting)
        </button>

        {/* Queue List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            Waiting ({waitingEntries.length})
          </h2>

          {waitingEntries.length === 0 ? (
            <p className="text-slate-400 text-center py-8">Queue is empty</p>
          ) : (
            <div className="space-y-3">
              {waitingEntries.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">
                        {entry.visitorName || 'Anonymous'}
                      </div>
                      {entry.visitorPhone && (
                        <div className="text-sm text-slate-500">{entry.visitorPhone}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400 text-sm">
                    <Clock size={14} />
                    {new Date(entry.joinedAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
