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
  Activity
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function AnalyticsDashboard() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [usage, setUsage] = useState<UsageAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalytics = async () => {
    try {
      setRefreshing(true);
      const [overviewRes, usageRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/analytics/overview`),
        fetch(`${API_URL}/api/v1/analytics/usage?days=30`)
      ]);

      if (overviewRes.ok) {
        const overviewData = await overviewRes.json();
        setOverview(overviewData);
      }

      if (usageRes.ok) {
        const usageData = await usageRes.json();
        setUsage(usageData);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 size={28} />
            Analytics Dashboard
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Real-time metrics and usage statistics
          </p>
        </div>
        <div className="flex gap-2">
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
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
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
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
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
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            Top Scanned Locations
          </h3>
          <div className="space-y-2">
            {usage.top_scanned_locations.map((location, idx) => (
              <div
                key={location.qr_code}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">
                      {location.qr_code}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      Floor Plan: {location.floor_plan_id.substring(0, 8)}...
                    </div>
                  </div>
                </div>
                <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
                  {location.scan_count} scans
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Health */}
      {overview && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            System Health
          </h3>
          <div className="flex items-center gap-4">
            <div className={cn(
              "px-4 py-2 rounded-lg font-medium",
              overview.system_health.status === "operational"
                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
            )}>
              {overview.system_health.status.toUpperCase()}
            </div>
            <div className="text-slate-600 dark:text-slate-400">
              Database: {overview.system_health.database_connected ? "Connected" : "Disconnected"}
            </div>
            {overview.timestamp && (
              <div className="text-sm text-slate-500 dark:text-slate-400 ml-auto">
                Last updated: {new Date(overview.timestamp).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
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
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300",
    green: "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300",
    orange: "bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300",
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-3 rounded-lg", colorClasses[color])}>
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
    <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700 last:border-0">
      <span className="text-slate-600 dark:text-slate-400">{label}</span>
      <span className="font-bold text-slate-900 dark:text-white">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
    </div>
  );
}
