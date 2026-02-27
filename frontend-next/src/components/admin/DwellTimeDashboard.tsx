/**
 * Dwell Time Dashboard Component
 * Per-booth dwell time analytics with bar charts and CSV export
 */

import React, { useState, useEffect } from 'react';
import { Clock, Download, RefreshCw, BarChart3 } from 'lucide-react';
import { analyticsApi } from '@/lib/api';
import { cn } from '@/lib/utils';

interface DwellData {
  totalVisits: number;
  avgDwellSeconds: number;
  minDwellSeconds: number;
  maxDwellSeconds: number;
  byHour: { hour: number; visitCount: number; avgDwellSeconds: number }[];
  byBooth: { boothId: string; boothName: string; visitCount: number; avgDwellSeconds: number }[];
}

export function DwellTimeDashboard() {
  const [data, setData] = useState<DwellData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const loadData = async () => {
    try {
      setRefreshing(true);
      const result = await analyticsApi.getDwell({
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      setData(result);
    } catch (error) {
      console.error('Failed to load dwell data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFilter = () => {
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const maxDwell = data ? Math.max(...data.byBooth.map(b => b.avgDwellSeconds), 1) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock size={28} />
            Dwell Time Analytics
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Visitor time spent at each booth
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            disabled={refreshing}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} className={cn(refreshing && 'animate-spin')} />
            Refresh
          </button>
          <button
            onClick={() => analyticsApi.exportCsv()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Date Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-end gap-4 flex-wrap">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>
        <button
          onClick={handleFilter}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium"
        >
          Apply
        </button>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SummaryCard label="Total Visits" value={data.totalVisits} />
          <SummaryCard label="Avg Dwell" value={`${data.avgDwellSeconds}s`} />
          <SummaryCard label="Min Dwell" value={`${data.minDwellSeconds}s`} />
          <SummaryCard label="Max Dwell" value={`${data.maxDwellSeconds}s`} />
        </div>
      )}

      {/* Per-Booth Bar Chart */}
      {data && data.byBooth.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 size={20} />
            Average Dwell Time by Booth
          </h3>
          <div className="space-y-3">
            {data.byBooth.map((booth) => (
              <div key={booth.boothId} className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                  {booth.boothName}
                </div>
                <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                    style={{ width: `${Math.max((booth.avgDwellSeconds / maxDwell) * 100, 5)}%` }}
                  >
                    <span className="text-xs text-white font-bold">
                      {booth.avgDwellSeconds}s
                    </span>
                  </div>
                </div>
                <div className="w-20 text-right text-sm text-slate-500 dark:text-slate-400">
                  {booth.visitCount} visits
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hourly Distribution */}
      {data && data.byHour.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            Visits by Hour
          </h3>
          <div className="flex items-end gap-1 h-40">
            {Array.from({ length: 24 }, (_, hour) => {
              const hourData = data.byHour.find(h => h.hour === hour);
              const maxVisits = Math.max(...data.byHour.map(h => h.visitCount), 1);
              const height = hourData ? (hourData.visitCount / maxVisits) * 100 : 0;

              return (
                <div
                  key={hour}
                  className="flex-1 flex flex-col items-center justify-end"
                  title={hourData ? `${hour}:00 - ${hourData.visitCount} visits, avg ${hourData.avgDwellSeconds}s` : `${hour}:00 - No visits`}
                >
                  <div
                    className="w-full bg-indigo-400 dark:bg-indigo-500 rounded-t transition-all duration-500"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                  {hour % 4 === 0 && (
                    <span className="text-[10px] text-slate-400 mt-1">{hour}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {data && data.totalVisits === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <Clock size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400">No dwell data yet</h3>
          <p className="text-slate-400 dark:text-slate-500 mt-1">
            Data will appear here once visitors use the queue system.
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
      <div className="text-2xl font-bold text-slate-900 dark:text-white">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{label}</div>
    </div>
  );
}
