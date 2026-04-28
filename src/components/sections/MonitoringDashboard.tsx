"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Eye, Loader2, RefreshCw, Trash2 } from "lucide-react";
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

  // Poll jobs from backend
  const { data: jobsData, isLoading: loadingJobs, refetch: refetchJobs } = usePolling<{ success?: boolean; jobs?: JobSummary[]; error?: string }>(
    "/api/jobs",
    { interval: 5000 }
  );

  // Poll alerts from backend
  const { data: alertsData, isLoading: loadingAlerts, refetch: refetchAlerts } = usePolling<{ success?: boolean; alerts?: AlertItem[]; error?: string }>(
    "/api/alerts",
    { interval: 5000 }
  );

  const jobs = (jobsData?.jobs ?? []).filter((job) => job.result_count >= 0);
  const alerts = alertsData?.alerts ?? [];

  const handleRefreshAll = async () => {
    await Promise.all([refetchJobs(), refetchAlerts()]);
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

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 md:px-6 lg:px-8 lg:py-6">
        <div className="flex items-center justify-between gap-4 text-sm">
          <Link href="/" className="inline-flex items-center gap-2 font-medium text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back to audit
          </Link>

          <div className="flex items-center gap-2">
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

            <Badge variant="outline" className="rounded-full border-slate-200 bg-white/80 px-3 py-1 text-slate-600">
              {loadingJobs ? "Loading jobs..." : `${totalJobs} jobs`}
            </Badge>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.45fr_0.55fr_0.55fr]">
          <Card className="border-slate-200/70 bg-white/90 shadow-[0_16px_42px_-28px_rgba(15,23,42,0.25)] backdrop-blur">
            <CardContent className="flex h-full flex-col justify-between gap-4 p-5 lg:p-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-600">
                  Monitoring Dashboard
                </div>
                <h1 className="mt-3 text-2xl font-serif font-bold tracking-tight text-slate-950 md:text-3xl">
                  Bias monitoring overview
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Review live monitoring jobs, inspect the selected run, and keep alerts visible without overwhelming the page.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link href="/" className="inline-flex h-8 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800">
                  Run new audit
                </Link>
                <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">
                  {loadingAlerts ? "Loading alerts..." : `${activeAlerts} alerts`}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/70 bg-white/85 shadow-sm backdrop-blur">
            <CardHeader className="pb-1 pt-4">
              <CardTitle className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Total Jobs</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-3xl font-serif font-bold text-slate-950">{loadingJobs ? "—" : totalJobs}</div>
              <p className="mt-1 text-sm text-slate-500">Real jobs only.</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/70 bg-white/85 shadow-sm backdrop-blur">
            <CardHeader className="pb-1 pt-4">
              <CardTitle className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Active Alerts</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-3xl font-serif font-bold text-red-600">{loadingAlerts ? "—" : activeAlerts}</div>
              <p className="mt-1 text-sm text-slate-500">Top alerts summarized below.</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.35fr_0.65fr]">
          <Card className="border-slate-200/70 bg-white/90 shadow-sm backdrop-blur">
            <CardHeader className="border-b border-slate-100 px-4 py-4 md:px-5">
              <CardTitle className="text-base font-serif font-bold text-slate-950">Insights Panel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              {insight ? (
                <>
                  <div className="grid gap-2 md:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">Bias trend summary</div>
                      <div className="mt-1.5 text-sm leading-5 text-slate-900">{insight.summary}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">Current vs previous</div>
                      <div className="mt-1.5 text-sm leading-5 text-slate-900">
                        {formatSignedNumber(insight.previousModelAverage)} to {formatSignedNumber(insight.currentModelAverage)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">% change</div>
                      <div className={`mt-1.5 text-xl font-serif font-bold ${insight.modelTrendChange === null ? "text-slate-400" : insight.modelTrendChange > 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {formatSignedPercent(insight.modelTrendChange)}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-indigo-600">Recommendation</div>
                    <div className="mt-1.5 text-sm leading-5 text-slate-900">{insight.recommendation}</div>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center text-sm text-slate-500">
                  Insights appear after a monitoring job is selected.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white shadow-sm">
            <CardHeader className="border-b border-red-100 px-4 py-4 md:px-5">
              <CardTitle className="text-base font-serif font-bold text-red-700">Biggest Issue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              {insight?.largestIssue ? (
                <>
                  <div className="rounded-2xl border border-red-200 bg-white p-4 shadow-[0_10px_28px_-20px_rgba(220,38,38,0.28)]">
                    <div className="text-sm font-semibold text-red-700">{insight.largestIssue.alert_message ?? "Largest deviation"}</div>
                    <div className="mt-2 text-2xl font-serif font-bold text-slate-950">
                      {formatCompactChange(safeDifference(insight.largestIssue.dataset_spd, insight.largestIssue.model_spd))}
                    </div>
                    <p className="mt-2 text-sm leading-5 text-slate-600">
                      {formatDateTime(insight.largestIssue.timestamp)} - model SPD {insight.largestIssue.model_spd?.toFixed(3) ?? "--"} vs dataset SPD {insight.largestIssue.dataset_spd?.toFixed(3) ?? "--"}.
                    </p>
                  </div>
                  <div className="rounded-xl border border-red-100 bg-red-50/80 p-3 text-sm leading-5 text-red-700">
                    This combines the largest model-vs-dataset gap with an alert trigger.
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-red-200 bg-red-50/70 px-4 py-8 text-center text-sm text-red-600">
                  Select a job with seeded history to surface the biggest issue.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {insight ? (
          <div className="grid gap-3 md:grid-cols-3">
            <Card className="border-slate-200/70 bg-white/90 shadow-sm backdrop-blur">
              <CardHeader className="pb-1 pt-4">
                <CardTitle className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Previous period</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="text-2xl font-serif font-bold text-slate-950">{formatSignedNumber(insight.previousModelAverage)}</div>
                <p className="mt-1 text-sm text-slate-500">Earlier window average.</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200/70 bg-white/90 shadow-sm backdrop-blur">
              <CardHeader className="pb-1 pt-4">
                <CardTitle className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Current period</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="text-2xl font-serif font-bold text-slate-950">{formatSignedNumber(insight.currentModelAverage)}</div>
                <p className="mt-1 text-sm text-slate-500">Latest window average.</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200/70 bg-white/90 shadow-sm backdrop-blur">
              <CardHeader className="pb-1 pt-4">
                <CardTitle className="text-[10px] uppercase tracking-[0.28em] text-slate-500">% change</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className={`text-2xl font-serif font-bold ${insight.modelTrendChange === null ? "text-slate-400" : insight.modelTrendChange > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {formatSignedPercent(insight.modelTrendChange)}
                </div>
                <p className="mt-1 text-sm text-slate-500">Model bias change.</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <Card className="border-slate-200/70 bg-white/90 shadow-sm backdrop-blur">
          <CardHeader className="border-b border-slate-100 px-4 py-4 md:px-5">
            <CardTitle className="text-base font-serif font-bold text-slate-950">Monitoring Jobs</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {loadingJobs ? (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading saved monitoring jobs...
              </div>
            ) : jobs.length ? (
              <div className="grid gap-2">
                {jobs.map((job) => {
                  const selected = job.id === selectedJobId;
                  const hasData = job.result_count > 0;

                  return (
                    <div
                      key={job.id}
                      className={`rounded-2xl border p-3 transition-all ${selected ? "border-slate-900 bg-slate-950 text-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.6)]" : "border-slate-200 bg-white"}`}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className={`text-sm font-semibold ${selected ? "text-white" : "text-slate-950"}`}>
                              {job.dataset_name}
                            </h3>
                            <Badge
                              variant="outline"
                              className={`rounded-full px-2 py-0.5 text-[10px] ${selected ? "border-white/20 bg-white/10 text-white" : "border-slate-200 bg-slate-50 text-slate-700"}`}
                            >
                              {job.frequency}
                            </Badge>
                            {!hasData ? <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 text-slate-500">No data yet</Badge> : null}
                          </div>

                          <p className={`truncate text-xs ${selected ? "text-slate-300" : "text-slate-500"}`}>
                            Last run {formatDateTime(job.last_run)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedJobId(job.id)}
                            disabled={!hasData}
                            className="border-slate-200 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Eye className="mr-2 h-3.5 w-3.5" />
                            View Analysis
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void handleDelete(job.id)}
                            disabled={deletingJobId === job.id}
                            className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                          >
                            {deletingJobId === job.id ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-2 h-3.5 w-3.5" />}
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
                No monitoring jobs yet.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-3 xl:grid-cols-[1.35fr_0.65fr]">
          <Card className="border-slate-200/70 bg-white/90 shadow-sm backdrop-blur">
            <CardHeader className="border-b border-slate-100 px-4 py-4 md:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base font-serif font-bold text-slate-950">Trend Analysis</CardTitle>
                {selectedJob ? <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 text-slate-700">{selectedJob.dataset_name}</Badge> : null}
              </div>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
              {!selectedJob ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center text-sm text-slate-500">
                  Select a job to inspect bias trends.
                </div>
              ) : loadingResults ? (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading historical results...
                </div>
              ) : selectedJobHasData ? (
                <>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    <div className="text-slate-600">View mode</div>
                    <div className="inline-flex rounded-full border border-slate-200 bg-white p-0.5">
                      <button
                        type="button"
                        onClick={() => setChartMode("day")}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${chartMode === "day" ? "bg-slate-950 text-white" : "text-slate-600 hover:text-slate-950"}`}
                      >
                        Day View
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartMode("week")}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${chartMode === "week" ? "bg-slate-950 text-white" : "text-slate-600 hover:text-slate-950"}`}
                      >
                        Weekly View
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <Card size="sm" className="border-slate-200 bg-slate-50/80">
                      <CardContent className="p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">Latest model SPD</div>
                        <div className="mt-1.5 text-xl font-serif font-bold text-slate-950">{formatSignedNumber(latestResult?.model_spd)}</div>
                      </CardContent>
                    </Card>

                    <Card size="sm" className="border-slate-200 bg-slate-50/80">
                      <CardContent className="p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">Latest dataset SPD</div>
                        <div className="mt-1.5 text-xl font-serif font-bold text-slate-950">{formatSignedNumber(latestResult?.dataset_spd)}</div>
                      </CardContent>
                    </Card>

                    <Card size="sm" className="border-slate-200 bg-slate-50/80">
                      <CardContent className="p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">Bias difference</div>
                        <div className="mt-1.5 text-xl font-serif font-bold text-slate-950">{formatCompactChange(latestGap)}</div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-slate-200 bg-white">
                    <CardHeader className="px-4 py-3">
                      <CardTitle className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                        {chartMode === "day" ? "Day-wise Trend" : "Weekly Trend"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-2 pb-4">
                      <div className="h-[260px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                            <XAxis
                              dataKey={chartMode === "day" ? "date" : "label"}
                              stroke="#94A3B8"
                              tickLine={false}
                              axisLine={false}
                              interval={0}
                              height={36}
                            />
                            <YAxis stroke="#94A3B8" tickLine={false} axisLine={false} width={34} />
                            <Tooltip />
                            <Legend />
                            <Line type="linear" dataKey="dataset_spd" name="Dataset SPD" stroke="#2563EB" strokeWidth={1.8} dot={{ r: 3, strokeWidth: 1, fill: "#2563EB" }} activeDot={{ r: 4 }} />
                            <Line type="linear" dataKey="model_spd" name="Model SPD" stroke="#DC2626" strokeWidth={1.8} dot={{ r: 3, strokeWidth: 1, fill: "#DC2626" }} activeDot={{ r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center text-sm text-slate-500">
                  Monitoring scheduled. Waiting for first run...
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Card className="border-slate-200/70 bg-white/90 shadow-sm backdrop-blur" id="alerts">
              <CardHeader className="border-b border-slate-100 px-4 py-4 md:px-5">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base font-serif font-bold text-slate-950">Alerts</CardTitle>
                  <Link href="#alerts" className="text-xs font-medium text-slate-500 hover:text-slate-900">
                    View all alerts
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 p-4">
                {loadingAlerts ? (
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading alerts...
                  </div>
                ) : topAlerts.length ? (
                  topAlerts.map((group) => {
                    const alert = group.latest;
                    return (
                      <div key={group.label} className="rounded-xl border border-red-100 bg-red-50/70 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
                              <AlertTriangle className="h-4 w-4 shrink-0" />
                              <span className="truncate">{group.label}</span>
                            </div>
                            <div className="mt-1 text-xs text-red-600">{group.count} similar alerts detected</div>
                            <div className="mt-1 text-xs text-red-500">
                              {alert.dataset_name ?? `Job ${alert.job_id}`} - {formatDateTime(alert.timestamp)}
                            </div>
                          </div>
                          <Badge variant="outline" className="border-red-200 bg-white text-red-700">
                            {group.count}
                          </Badge>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center text-sm text-slate-500">
                    No active alerts right now.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200/70 bg-white/90 shadow-sm backdrop-blur">
              <CardHeader className="border-b border-slate-100 px-4 py-4 md:px-5">
                <CardTitle className="text-base font-serif font-bold text-slate-950">Selected Job</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">Dataset</div>
                  <div className="mt-1.5 text-sm font-medium text-slate-900">{selectedJob?.dataset_name ?? "No job selected"}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">Frequency</div>
                  <div className="mt-1.5 text-sm font-medium text-slate-900">{selectedJob?.frequency ?? "--"}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">Last run</div>
                  <div className="mt-1.5 text-sm font-medium text-slate-900">{selectedJob?.last_run ? formatDateTime(selectedJob.last_run) : "No data yet"}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

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
