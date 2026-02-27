/**
 * Analytics Dashboard Component
 * 
 * Real-time analytics dashboard with key metrics for investor demos.
 * Displays usage statistics, venue analytics, and export capabilities.
 */
import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  MapPin,
  Navigation,
  QrCode,
  Download,
  RefreshCw,
  Activity,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalyticsOverview {
  timestamp: string;
  overview: {
    total_floor_plans: number;
    total_nodes: number;
    total_edges: number;
    total_pois: number;
    searchable_pois: number;
    avg_nodes_per_floor_plan: number;
    avg_edges_per_floor_plan: number;
  };
  qr_analytics: {
    total_qr_anchors: number;
    active_qr_anchors: number;
    total_scans: number;
    avg_scans_per_anchor: number;
  };
  system_health: {
    status: string;
    database_connected: boolean;
  };
}

interface UsageAnalytics {
  period_days: number;
  usage: {
    total_qr_scans: number;
    active_qr_anchors: number;
    avg_scans_per_day: number;
  };
  top_scanned_locations: Array<{
    qr_code: string;
    scan_count: number;
    floor_plan_id: string;
  }>;
}

interface DwellAnalytics {
  totalVisits: number;
  avgDwellSeconds: number;
  minDwellSeconds: number;
  maxDwellSeconds: number;
  byHour: Array<{ hour: number; visitCount: number; avgDwellSeconds: number }>;
  byBooth: Array<{ boothId: string; boothName: string; visitCount: number; avgDwellSeconds: number }>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'dwell'>('overview');
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [usage, setUsage] = useState<UsageAnalytics | null>(null);
  const [dwell, setDwell] = useState<DwellAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalytics = async () => {
    try {
      setRefreshing(true);
      const [overviewRes, usageRes, dwellRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/analytics/overview`),
        fetch(`${API_URL}/api/v1/analytics/usage?days=30`),
        fetch(`${API_URL}/api/v1/analytics/dwell`)
      ]);

      if (overviewRes.ok) {
        const overviewData = await overviewRes.json();
        setOverview(overviewData);
      }

      if (usageRes.ok) {
        const usageData = await usageRes.json();
        setUsage(usageData);
      }

      if (dwellRes.ok) {
        const dwellData = await dwellRes.json();
        setDwell(dwellData);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleExportCSV = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/analytics/export/csv`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `navio_analytics_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export CSV:', error);
    }
  };

  const handleExportJSON = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/analytics/export/json`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `navio_analytics_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export JSON:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 size={28} />
            Analytics Dashboard
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Real-time metrics and usage statistics
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={loadAnalytics}
            disabled={refreshing}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} className={cn(refreshing && "animate-spin")} />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            onClick={handleExportJSON}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <Download size={16} />
            Export JSON
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        <button
          className={cn("px-6 py-3 font-medium text-sm border-b-2 transition-colors duration-200", activeTab === 'overview' ? "border-primary-600 text-primary-600" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}
          onClick={() => setActiveTab('overview')}
        >
          System Overview
        </button>
        <button
          className={cn("px-6 py-3 font-medium text-sm border-b-2 transition-colors duration-200", activeTab === 'dwell' ? "border-primary-600 text-primary-600" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}
          onClick={() => setActiveTab('dwell')}
        >
          Dwell Time & Queue Stats
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Key Metrics Grid */}
          {overview && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                icon={<MapPin size={24} />}
                title="Floor Plans"
                value={overview.overview.total_floor_plans}
                subtitle="Active venues"
                color="blue"
              />
              <MetricCard
                icon={<Navigation size={24} />}
                title="Navigation Points"
                value={overview.overview.total_nodes}
                subtitle={`${overview.overview.avg_nodes_per_floor_plan.toFixed(1)} avg per floor`}
                color="green"
              />
              <MetricCard
                icon={<QrCode size={24} />}
                title="QR Scans"
                value={overview.qr_analytics.total_scans}
                subtitle={`${overview.qr_analytics.active_qr_anchors} active anchors`}
                color="purple"
              />
              <MetricCard
                icon={<Activity size={24} />}
                title="POIs"
                value={overview.overview.total_pois}
                subtitle={`${overview.overview.searchable_pois} searchable`}
                color="orange"
              />
            </div>
          )}

          {/* Detailed Statistics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Navigation Graph Stats */}
            {overview && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp size={20} />
                  Navigation Graph Statistics
                </h3>
                <div className="space-y-3">
                  <StatRow label="Total Nodes" value={overview.overview.total_nodes} />
                  <StatRow label="Total Edges" value={overview.overview.total_edges} />
                  <StatRow
                    label="Avg Nodes per Floor"
                    value={overview.overview.avg_nodes_per_floor_plan.toFixed(1)}
                  />
                  <StatRow
                    label="Avg Edges per Floor"
                    value={overview.overview.avg_edges_per_floor_plan.toFixed(1)}
                  />
                </div>
              </div>
            )}

            {/* QR Code Analytics */}
            {overview && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <QrCode size={20} />
                  QR Code Usage
                </h3>
                <div className="space-y-3">
                  <StatRow label="Total Anchors" value={overview.qr_analytics.total_qr_anchors} />
                  <StatRow label="Active Anchors" value={overview.qr_analytics.active_qr_anchors} />
                  <StatRow label="Total Scans" value={overview.qr_analytics.total_scans} />
                  <StatRow
                    label="Avg Scans per Anchor"
                    value={overview.qr_analytics.avg_scans_per_anchor.toFixed(1)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Top Scanned Locations */}
          {usage && usage.top_scanned_locations.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                Top Scanned Locations
              </h3>
              <div className="space-y-2">
                {usage.top_scanned_locations.map((location, idx) => (
                  <div
                    key={location.qr_code}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">
                          Booth/Node {location.qr_code.substring(0, 8)}...
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          Floor Plan: {location.floor_plan_id.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                    <div className="text-xl font-bold text-primary-600 dark:text-primary-400">
                      {location.scan_count} scans
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'dwell' && dwell && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Key Metrics Grid for Dwell Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={<UsersIcon size={24} />}
              title="Total Completed Visits"
              value={dwell.totalVisits}
              subtitle="All time visitors"
              color="blue"
            />
            <MetricCard
              icon={<Clock size={24} />}
              title="Avg Dwell Time"
              value={`${Math.round(dwell.avgDwellSeconds / 60)}m ${dwell.avgDwellSeconds % 60}s`}
              subtitle="Across all booths"
              color="green"
            />
            <MetricCard
              icon={<TrendingUp size={24} />}
              title="Max Dwell Time"
              value={`${Math.round(dwell.maxDwellSeconds / 60)}m ${dwell.maxDwellSeconds % 60}s`}
              subtitle="Longest recorded visit"
              color="purple"
            />
            <MetricCard
              icon={<Activity size={24} />}
              title="Active Booths"
              value={dwell.byBooth.length}
              subtitle="Booths with queue activity"
              color="orange"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Dwell Time by Booth (Bar Chart using CSS) */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <BarChart3 size={20} />
                Average Dwell Time by Booth
              </h3>

              <div className="space-y-5">
                {dwell.byBooth.length > 0 ? (
                  dwell.byBooth.slice(0, 8).map((b, i) => {
                    const maxDwell = Math.max(...dwell.byBooth.map(x => x.avgDwellSeconds));
                    const percentage = maxDwell > 0 ? (b.avgDwellSeconds / maxDwell) * 100 : 0;
                    return (
                      <div key={b.boothId} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-slate-700 dark:text-slate-300">{b.boothName}</span>
                          <span className="text-slate-500 font-mono">
                            {Math.round(b.avgDwellSeconds / 60)}m {b.avgDwellSeconds % 60}s ({b.visitCount} visits)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-indigo-500 h-3 rounded-full transition-all duration-1000"
                            style={{ width: `${Math.max(percentage, 5)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-slate-500 text-center py-8">No queue data available yet.</p>
                )}
              </div>
            </div>

            {/* Visit Count by Hour */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <Clock size={20} />
                Busy Hours (Visits by Time)
              </h3>

              <div className="space-y-5">
                {dwell.byHour.length > 0 ? (
                  dwell.byHour.map(h => {
                    const maxVisits = Math.max(...dwell.byHour.map(x => x.visitCount));
                    const percentage = maxVisits > 0 ? (h.visitCount / maxVisits) * 100 : 0;

                    // Format hour (0-23 to 12h)
                    const ampm = h.hour >= 12 ? 'PM' : 'AM';
                    const displayHour = h.hour % 12 === 0 ? 12 : h.hour % 12;

                    return (
                      <div key={h.hour} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-slate-700 dark:text-slate-300">{displayHour}:00 {ampm}</span>
                          <span className="text-slate-500 font-mono">{h.visitCount} visits</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-3 rounded-full transition-all duration-1000"
                            style={{ width: `${Math.max(percentage, 5)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-slate-500 text-center py-8">No queue data available yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Health Status Banner */}
      {overview && (
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                "px-3 py-1 text-sm font-bold rounded-full flex items-center gap-1.5",
                overview.system_health.status === "operational"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              )}>
                <div className={cn("w-2 h-2 rounded-full", overview.system_health.status === "operational" ? "bg-green-500 animate-pulse" : "bg-red-500")}></div>
                {overview.system_health.status.toUpperCase()}
              </div>
              <div className="text-sm font-medium text-slate-600 dark:text-slate-400 border-l border-slate-300 dark:border-slate-700 pl-4">
                Database: {overview.system_health.database_connected ? <span className="text-green-600 dark:text-green-400">Connected</span> : <span className="text-red-500">Disconnected</span>}
              </div>
            </div>
            {overview.timestamp && (
              <div className="text-xs font-mono text-slate-400 dark:text-slate-500">
                Last updated: {new Date(overview.timestamp).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function UsersIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function MetricCard({
  icon,
  title,
  value,
  subtitle,
  color = "blue"
}: {
  icon: React.ReactNode;
  title: string;
  value: number | string;
  subtitle: string;
  color?: "blue" | "green" | "purple" | "orange";
}) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400",
    green: "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400",
    orange: "bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400",
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-3 rounded-xl", colorClasses[color])}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
        {title}
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-500">
        {subtitle}
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 px-2 rounded-lg transition-colors -mx-2">
      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</span>
      <span className="font-bold text-slate-900 dark:text-white font-mono">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
    </div>
  );
}
