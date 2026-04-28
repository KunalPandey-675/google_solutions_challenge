"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Eye,
  Loader2,
  RefreshCw,
  Trash2,
  TrendingUp,
  AlertCircle,
  Target,
  Activity,
} from "lucide-react";
import { usePolling } from "@/hooks/usePolling";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type JobSummary = {
  id: number;
  dataset_name: string;
  frequency: string;
  last_run: string | null;
  next_run: string | null;
  result_count: number;
  alert_count: number;
};

type MonitoringResult = {
  id: number;
  job_id: number;
  timestamp: string;
  dataset_spd: number | null;
  model_spd: number | null;
  verdict: string;
  alert_triggered: boolean;
  alert_message: string | null;
};

type AlertItem = MonitoringResult & {
  dataset_name?: string | null;
};

type ChartMode = "day" | "week";

function formatDateTime(value?: string | null) {
  if (!value) {
    return "No data yet";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No data yet";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatSignedNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(3)}`;
}

function formatSignedPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatCompactChange(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
}

function average(values: Array<number | null | undefined>) {
  const filtered = values.filter((item): item is number => typeof item === "number" && Number.isFinite(item));
  if (!filtered.length) {
    return null;
  }

  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function percentChange(currentValue: number | null, previousValue: number | null) {
  if (currentValue === null || previousValue === null || previousValue === 0) {
    return null;
  }

  return ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
}

function safeDifference(datasetSpd: number | null | undefined, modelSpd: number | null | undefined) {
  if (datasetSpd === null || datasetSpd === undefined || modelSpd === null || modelSpd === undefined) {
    return null;
  }

  return modelSpd - datasetSpd;
}

function buildWeeklyAggregation(results: MonitoringResult[]) {
  const buckets = new Map<string, { label: string; dataset: number; model: number; count: number; sortKey: number }>();

  for (const result of results) {
    const date = new Date(result.timestamp);
    if (Number.isNaN(date.getTime())) {
      continue;
    }

    const weekStart = new Date(date);
    const offset = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - offset);
    weekStart.setHours(0, 0, 0, 0);

    const key = weekStart.toISOString();
    const existing = buckets.get(key) ?? {
      label: `Week of ${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
      dataset: 0,
      model: 0,
      count: 0,
      sortKey: weekStart.getTime(),
    };

    existing.dataset += result.dataset_spd ?? 0;
    existing.model += result.model_spd ?? 0;
    existing.count += 1;
    buckets.set(key, existing);
  }

  return Array.from(buckets.values())
    .sort((left, right) => left.sortKey - right.sortKey)
    .map((bucket) => ({
      label: bucket.label,
      dataset_spd: bucket.count ? bucket.dataset / bucket.count : 0,
      model_spd: bucket.count ? bucket.model / bucket.count : 0,
    }));
}

function buildInsight(results: MonitoringResult[]) {
  if (!results.length) {
    return null;
  }

  const windowSize = results.length >= 10 ? 5 : Math.max(1, Math.ceil(results.length / 2));
  const previous = results.slice(Math.max(0, results.length - windowSize * 2), Math.max(0, results.length - windowSize));
  const current = results.slice(-windowSize);

  const previousModelAverage = average(previous.map((result) => result.model_spd));
  const currentModelAverage = average(current.map((result) => result.model_spd));
  const previousDatasetAverage = average(previous.map((result) => result.dataset_spd));
  const currentDatasetAverage = average(current.map((result) => result.dataset_spd));

  const modelTrendChange = percentChange(currentModelAverage, previousModelAverage);
  const datasetTrendChange = percentChange(currentDatasetAverage, previousDatasetAverage);
  const largestIssue = [...results].sort(
    (left, right) => Math.abs((right.model_spd ?? 0) - (right.dataset_spd ?? 0)) - Math.abs((left.model_spd ?? 0) - (left.dataset_spd ?? 0))
  )[0];

  let summary = "Bias is relatively stable across the selected window.";
  if (modelTrendChange !== null && modelTrendChange > 0) {
    summary = "Model SPD is rising in the latest runs.";
  } else if (modelTrendChange !== null && modelTrendChange < 0) {
    summary = "Model SPD has eased in the latest runs.";
  }

  let recommendation = "Continue monitoring the next scheduled run.";
  if ((largestIssue?.alert_triggered ?? false) || (currentModelAverage !== null && currentModelAverage > 0.35)) {
    recommendation = "Review thresholds and recalibrate before the next release.";
  } else if (modelTrendChange !== null && modelTrendChange > 10) {
    recommendation = "Investigate the drift spike and compare the protected-group split again.";
  } else if (Math.abs((currentModelAverage ?? 0) - (currentDatasetAverage ?? 0)) > 0.12) {
    recommendation = "The model is widening the gap versus the dataset; watch the next two runs closely.";
  }

  return {
    summary,
    recommendation,
    modelTrendChange,
    datasetTrendChange,
    previousModelAverage,
    currentModelAverage,
    previousDatasetAverage,
    currentDatasetAverage,
    largestIssue,
  };
}

function groupAlerts(alerts: AlertItem[]) {
  const grouped = new Map<string, AlertItem[]>();

  for (const alert of alerts) {
    const key = alert.alert_message ?? "Alert triggered";
    const existing = grouped.get(key) ?? [];
    existing.push(alert);
    grouped.set(key, existing);
  }

  return Array.from(grouped.entries()).map(([label, items]) => ({ label, items, latest: items[0], count: items.length }));
}

export function MonitoringDashboard() {
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [chartMode, setChartMode] = useState<ChartMode>("day");
  const [results, setResults] = useState<MonitoringResult[]>([]);
  const [deletingJobId, setDeletingJobId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [kpiData, setKpiData] = useState<{
    latestModelSpd: number | null;
    latestDatasetSpd: number | null;
    biasDifference: number | null;
    riskLevel: string;
    riskColor: string;
  } | null>(null);
  const [dashboardSummary, setDashboardSummary] = useState<{
    summary: string;
    generated: boolean;
    timestamp?: string;
  } | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Poll jobs from backend
  const { data: jobsData, isLoading: loadingJobs, refetch: refetchJobs } = usePolling<{ success?: boolean; jobs?: JobSummary[]; error?: string }>(
    "/api/jobs",
    { interval: 15000 }
  );

  // Poll alerts from backend
  const { data: alertsData, isLoading: loadingAlerts, refetch: refetchAlerts } = usePolling<{ success?: boolean; alerts?: AlertItem[]; error?: string }>(
    "/api/alerts",
    { interval: 15000 }
  );

  const jobs = (jobsData?.jobs ?? []).filter((job) => job.result_count >= 0);
  const alerts = alertsData?.alerts ?? [];

  const handleRefreshAll = async () => {
    await Promise.all([refetchJobs(), refetchAlerts()]);
    await generateDashboardSummary();
  };

  const generateDashboardSummary = async () => {
    setLoadingSummary(true);
    try {
      const riskLevel = latestResult?.model_spd !== null && latestResult?.model_spd !== undefined && Math.abs(latestResult.model_spd) > 0.3 ? "HIGH" : "LOW";
      
      const payload = {
        total_jobs: totalJobs,
        active_alerts: activeAlerts,
        latest_model_spd: latestResult?.model_spd ?? null,
        latest_dataset_spd: latestResult?.dataset_spd ?? null,
        bias_difference: latestGap,
        risk_level: riskLevel,
        monitoring_jobs: jobs,
        insights: insight ? {
          summary: insight.summary,
          recommendation: insight.recommendation,
          modelTrendChange: insight.modelTrendChange,
        } : {},
      };

      const response = await fetch("http://localhost:5001/api/dashboard-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as any;

      if (response.ok && data.success) {
        setDashboardSummary({
          summary: data.summary,
          generated: data.generated || false,
          timestamp: data.timestamp,
        });
      } else {
        setDashboardSummary({
          summary: data.error || "Failed to generate dashboard summary",
          generated: false,
        });
      }
    } catch (err) {
      console.error("Error generating dashboard summary:", err);
      setDashboardSummary({
        summary: "Unable to generate AI summary at this time",
        generated: false,
      });
    } finally {
      setLoadingSummary(false);
    }
  };

  // Auto-select first job when jobs load
  useEffect(() => {
    if (selectedJobId !== null || jobs.length === 0) {
      return;
    }

    setSelectedJobId(jobs[0].id);
  }, [jobs, selectedJobId]);

  // Poll job results when job is selected
  useEffect(() => {
    if (selectedJobId === null) {
      setResults([]);
      return;
    }

    const loadResults = async () => {
      setLoadingResults(true);
      setError(null);

      try {
        const response = await fetch(`/api/job-results/${selectedJobId}`);
        const data = (await response.json().catch(() => [])) as MonitoringResult[] | { error?: string };

        if (!response.ok) {
          const message = typeof data === "object" && data && "error" in data ? data.error : null;
          throw new Error(message ?? "Failed to load job results");
        }

        setResults(Array.isArray(data) ? data : []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load job results");
      } finally {
        setLoadingResults(false);
      }
    };

    void loadResults();

    // Poll results for the selected job
    const resultsInterval = setInterval(() => {
      void loadResults();
    }, 5000);

    return () => clearInterval(resultsInterval);
  }, [selectedJobId]);

  const selectedJob = useMemo(() => jobs.find((job) => job.id === selectedJobId) ?? null, [jobs, selectedJobId]);
  const selectedJobHasData = Boolean(selectedJob && selectedJob.result_count > 0 && results.length > 0);
  const weeklyData = useMemo(() => buildWeeklyAggregation(results), [results]);
  const chartData = chartMode === "day"
    ? results.map((result, index) => ({
        date: formatShortDate(result.timestamp),
        dataset_spd: result.dataset_spd ?? 0,
        model_spd: result.model_spd ?? 0,
        sequence: index,
      }))
    : weeklyData;
  const insight = useMemo(() => buildInsight(results), [results]);
  const topAlerts = useMemo(() => groupAlerts(alerts).slice(0, 3), [alerts]);
  const latestResult = results.length ? results[results.length - 1] : null;
  const totalJobs = jobs.length;
  const activeAlerts = alerts.length;
  const latestGap = safeDifference(latestResult?.dataset_spd, latestResult?.model_spd);

  // Generate dashboard summary only on first load
  useEffect(() => {
    if (jobs.length === 0) {
      return;
    }

    // Generate once when component mounts
    void generateDashboardSummary();
  }, []);

  const handleDelete = async (jobId: number) => {
    const confirmed = window.confirm("Delete this monitoring setup?");
    if (!confirmed) {
      return;
    }

    setDeletingJobId(jobId);
    setError(null);

    try {
      const response = await fetch(`/api/delete-job/${jobId}`, { method: "DELETE" });
      const data = (await response.json().catch(() => ({}))) as { success?: boolean; error?: string };

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to delete monitoring setup");
      }

      // Polling will automatically update the job list
      setMonitoringMessage("Monitoring setup deleted");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete monitoring setup");
    } finally {
      setDeletingJobId(null);
    }
  };

  const setMonitoringMessage = (message: string) => {
    // Optional: Add a toast notification here if you want to display deletion feedback
    console.log(message);
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#F6F7FA] text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.08),_transparent_36%),radial-gradient(circle_at_top_right,_rgba(37,99,235,0.12),_transparent_28%),linear-gradient(to_bottom,_rgba(255,255,255,0.85),_rgba(248,250,252,0.95))]" />
      <div className="absolute inset-x-0 top-0 h-64 bg-grid opacity-20" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 md:px-6 lg:px-8 lg:py-6">
        {/* Header Section */}
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 font-medium text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back to audit
          </Link>
          <Button
            onClick={handleRefreshAll}
            disabled={loadingJobs || loadingAlerts}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loadingJobs || loadingAlerts ? "animate-spin" : ""}`} />
            {loadingJobs || loadingAlerts ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        {/* Title Section */}
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-slate-950 md:text-4xl">
            Monitoring Dashboard
          </h1>
          <p className="mt-2 text-slate-600">Real-time bias monitoring and drift detection</p>
        </div>

        {/* TOP SECTION: KPI Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Latest Model SPD */}
          <Card className="border-slate-200/70 bg-gradient-to-br from-blue-50 to-white shadow-sm backdrop-blur">
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                  Latest Model SPD
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-3xl font-serif font-bold text-slate-950">
                {latestResult?.model_spd !== undefined ? formatSignedNumber(latestResult.model_spd) : "--"}
              </div>
              <p className="mt-2 text-xs text-slate-600">Statistical Parity Difference</p>
            </CardContent>
          </Card>

          {/* Latest Dataset SPD */}
          <Card className="border-slate-200/70 bg-gradient-to-br from-cyan-50 to-white shadow-sm backdrop-blur">
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                  Latest Dataset SPD
                </CardTitle>
                <Target className="h-4 w-4 text-cyan-600" />
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-3xl font-serif font-bold text-slate-950">
                {latestResult?.dataset_spd !== undefined ? formatSignedNumber(latestResult.dataset_spd) : "--"}
              </div>
              <p className="mt-2 text-xs text-slate-600">Data Fairness Baseline</p>
            </CardContent>
          </Card>

          {/* Bias Difference */}
          <Card className="border-slate-200/70 bg-gradient-to-br from-violet-50 to-white shadow-sm backdrop-blur">
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                  Bias Difference
                </CardTitle>
                <Activity className="h-4 w-4 text-violet-600" />
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className={`text-3xl font-serif font-bold ${
                latestGap !== null && Math.abs(latestGap) > 0.15 ? "text-red-600" : "text-slate-950"
              }`}>
                {formatCompactChange(latestGap)}
              </div>
              <p className="mt-2 text-xs text-slate-600">Model vs Data Gap</p>
            </CardContent>
          </Card>

          {/* Risk Level */}
          <Card className={`border-slate-200/70 bg-gradient-to-br ${
            latestResult?.model_spd !== null && latestResult?.model_spd !== undefined && Math.abs(latestResult.model_spd) > 0.3
              ? "from-red-50 to-white"
              : "from-emerald-50 to-white"
          } shadow-sm backdrop-blur`}>
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                  Risk Level
                </CardTitle>
                <AlertCircle className={`h-4 w-4 ${
                  latestResult?.model_spd !== null && latestResult?.model_spd !== undefined && Math.abs(latestResult.model_spd) > 0.3
                    ? "text-red-600"
                    : "text-emerald-600"
                }`} />
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex items-center gap-2">
                <span className={`text-3xl font-serif font-bold ${
                  latestResult?.model_spd !== null && latestResult?.model_spd !== undefined && Math.abs(latestResult.model_spd) > 0.3
                    ? "text-red-600"
                    : "text-emerald-600"
                }`}>
                  {latestResult?.model_spd !== null && latestResult?.model_spd !== undefined
                    ? Math.abs(latestResult.model_spd) > 0.3 ? "HIGH" : Math.abs(latestResult.model_spd) > 0.1 ? "MEDIUM" : "LOW"
                    : "--"}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-600">Bias Severity Status</p>
            </CardContent>
          </Card>
        </div>

        {/* MIDDLE SECTION: Bias Trend & Alerts */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Bias Trend Monitoring Chart (Dummy Data) */}
          <Card className="border-slate-200/70 bg-white/90 shadow-sm backdrop-blur lg:col-span-2">
            <CardHeader className="border-b border-slate-100 px-4 py-4 md:px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-serif font-bold text-slate-950">
                  Bias Trend Monitoring
                </CardTitle>
                <Badge variant="outline" className="text-xs">Day-wise</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {selectedJobHasData ? (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                      <XAxis
                        dataKey={chartMode === "day" ? "date" : "label"}
                        stroke="#94A3B8"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis stroke="#94A3B8" tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="dataset_spd"
                        name="Dataset SPD"
                        stroke="#0369A1"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "#0369A1" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="model_spd"
                        name="Model SPD"
                        stroke="#DC2626"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "#DC2626" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[320px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
                  <div className="text-center">
                    <TrendingUp className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">Select a monitoring job to view trends</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Alerts Panel */}
          <Card className="border-red-200/50 bg-gradient-to-br from-red-50/80 to-white shadow-sm backdrop-blur">
            <CardHeader className="border-b border-red-100 px-4 py-4 md:px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-serif font-bold text-red-700">
                  Active Alerts
                </CardTitle>
                <Badge variant="outline" className="border-red-200 bg-white text-red-600">
                  {loadingAlerts ? "-" : alerts.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              {loadingAlerts ? (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading alerts...
                </div>
              ) : topAlerts.length ? (
                topAlerts.map((group) => (
                  <div
                    key={group.label}
                    className="rounded-xl border border-red-200 bg-white p-3 shadow-xs"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-red-700 text-sm">{group.label}</p>
                        <p className="mt-1 text-xs text-slate-600">
                          {formatDateTime(group.latest.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-3 py-6 text-center text-sm text-emerald-700">
                  ✓ No alerts
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* THIRD SECTION: Monitoring Jobs & Drift Detection */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Monitoring Jobs (Real Data) */}
          <Card className="border-slate-200/70 bg-white/90 shadow-sm backdrop-blur lg:col-span-2">
            <CardHeader className="border-b border-slate-100 px-4 py-4 md:px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-serif font-bold text-slate-950">
                  Monitoring Jobs
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {loadingJobs ? "Loading..." : `${totalJobs} active`}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {loadingJobs ? (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading monitoring jobs...
                </div>
              ) : jobs.length ? (
                <div className="space-y-2">
                  {jobs.map((job) => {
                    const selected = job.id === selectedJobId;
                    const hasData = job.result_count > 0;

                    return (
                      <div
                        key={job.id}
                        className={`rounded-xl border p-3 transition-all ${
                          selected
                            ? "border-slate-900 bg-slate-950 text-white shadow-md"
                            : "border-slate-200 bg-slate-50 hover:bg-white"
                        }`}
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className={`font-semibold ${selected ? "text-white" : "text-slate-950"}`}>
                              {job.dataset_name}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-2">
                              <Badge
                                variant="outline"
                                className={`rounded-full px-2 py-0.5 text-xs ${
                                  selected
                                    ? "border-white/20 bg-white/10 text-white"
                                    : "border-slate-200 bg-white text-slate-700"
                                }`}
                              >
                                {job.frequency}
                              </Badge>
                              {!hasData && (
                                <Badge variant="outline" className="rounded-full border-slate-300 bg-slate-100 text-slate-600 text-xs">
                                  No data
                                </Badge>
                              )}
                            </div>
                            <p className={`mt-1 text-xs ${selected ? "text-slate-300" : "text-slate-600"}`}>
                              Last run: {formatDateTime(job.last_run)}
                            </p>
                            <p className={`text-xs ${selected ? "text-slate-300" : "text-slate-600"}`}>
                              Next run: {job.next_run ? formatDateTime(job.next_run) : "Manual"}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedJobId(job.id)}
                              disabled={!hasData}
                              className={`text-xs ${
                                selected
                                  ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
                                  : "border-slate-200 text-slate-700"
                              }`}
                            >
                              <Eye className="mr-1 h-3 w-3" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void handleDelete(job.id)}
                              disabled={deletingJobId === job.id}
                              className="border-red-200 text-red-700 hover:bg-red-50 text-xs"
                            >
                              {deletingJobId === job.id ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="mr-1 h-3 w-3" />
                              )}
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center text-sm text-slate-500">
                  No monitoring jobs yet. Create one to get started.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Drift Detection (Dummy Data) */}
          <Card className="border-slate-200/70 bg-gradient-to-br from-orange-50 to-white shadow-sm backdrop-blur">
            <CardHeader className="border-b border-orange-100 px-4 py-4 md:px-5">
              <CardTitle className="text-base font-serif font-bold text-orange-700">
                Drift Detection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="rounded-xl border border-orange-200 bg-white p-3">
                <p className="text-sm font-semibold text-orange-700">Bias Drift Status</p>
                <p className="mt-2 text-2xl font-serif font-bold text-slate-950">Detected</p>
                <p className="mt-1 text-xs text-orange-600">
                  Current model SPD exceeds baseline by 0.45
                </p>
              </div>

              <div className="rounded-xl border border-orange-200 bg-white p-3">
                <p className="text-sm font-semibold text-orange-700">Historical Average</p>
                <p className="mt-2 text-2xl font-serif font-bold text-slate-950">+0.15</p>
                <p className="mt-1 text-xs text-orange-600">
                  30-day rolling average
                </p>
              </div>

              <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                  <div>
                    <p className="text-xs font-semibold text-orange-700">Threshold Alert</p>
                    <p className="mt-1 text-xs text-orange-600">
                      Deviation from historical average exceeded safe margin
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* BOTTOM SECTION: Insights & Recommendations */}
        {insight ? (
          <Card className="border-indigo-200/50 bg-gradient-to-br from-indigo-50/80 to-white shadow-sm backdrop-blur">
            <CardHeader className="border-b border-indigo-100 px-4 py-4 md:px-5">
              <CardTitle className="text-base font-serif font-bold text-indigo-700">
                Insights & Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-indigo-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                    Bias Summary
                  </p>
                  <p className="mt-2 text-sm leading-5 text-slate-900">{insight.summary}</p>
                </div>
                <div className="rounded-xl border border-indigo-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                    Trend Analysis
                  </p>
                  <p className="mt-2 text-sm leading-5 text-slate-900">
                    Current vs previous: {formatSignedNumber(insight.previousModelAverage)} →{" "}
                    {formatSignedNumber(insight.currentModelAverage)} (
                    <span
                      className={
                        insight.modelTrendChange === null
                          ? "text-slate-600"
                          : insight.modelTrendChange > 0
                            ? "text-red-600 font-semibold"
                            : "text-emerald-600 font-semibold"
                      }
                    >
                      {formatSignedPercent(insight.modelTrendChange)}
                    </span>
                    )
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 mb-2">
                  ✓ Recommendation
                </p>
                <p className="text-sm leading-5 text-slate-900">{insight.recommendation}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Dashboard Summary Section (AI-Generated) */}
        <Card className="border-emerald-200/50 bg-gradient-to-br from-emerald-50/80 to-white shadow-sm backdrop-blur">
          <CardHeader className="border-b border-emerald-100 px-4 py-4 md:px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-serif font-bold text-emerald-700">
                Executive Summary
              </CardTitle>
              <div className="flex items-center gap-2">
                {dashboardSummary?.generated && (
                  <Badge variant="outline" className="border-emerald-200 bg-white text-emerald-600 text-xs">
                    AI Generated
                  </Badge>
                )}
                <Button
                  onClick={() => void generateDashboardSummary()}
                  disabled={loadingSummary}
                  size="sm"
                  variant="outline"
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs h-8"
                >
                  {loadingSummary ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Regenerate
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {dashboardSummary ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-emerald-200 bg-white p-4">
                  <p className="text-sm leading-6 text-slate-900">{dashboardSummary.summary}</p>
                </div>
                {dashboardSummary.timestamp && (
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Last updated: {new Date(dashboardSummary.timestamp).toLocaleTimeString()}</span>
                    {dashboardSummary.generated && <span className="text-emerald-600">✓ Powered by Gemini AI</span>}
                  </div>
                )}
              </div>
            ) : loadingSummary ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating dashboard summary...
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/70 px-4 py-8 text-center text-sm text-emerald-600">
                Summary will appear here once data is available
              </div>
            )}
          </CardContent>
        </Card>

        {error ? (
          <Card className="border-red-200 bg-red-50/90">
            <CardContent className="flex items-start gap-3 p-4 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <span>{error}</span>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </section>
  );
}
