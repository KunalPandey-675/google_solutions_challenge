"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent } from "react";
import { AlertCircle, CheckCircle2, Clock3, Info, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AnalyzeApiResponse = {
  success: boolean;
  detected_protected: string;
  detected_target: string;
  metrics: {
    disparate_impact: number | null;
    statistical_parity_difference: number | null;
    mean_difference: number | null;
    equal_opportunity_difference?: number | null;
    average_odds_difference?: number | null;
  };
  severity: "HIGH" | "LOW";
  insight?: string;
  remediation?: string;
  bias_comparison?: {
    verdict?: string;
  };
  protected_values?: string[];
  target_values?: string[];
  error?: string;
};

type CreateJobResponse = {
  success: boolean;
  job_id: number;
  next_run?: string | null;
  error?: string;
};

type MonitoringConfig = {
  id: number;
  datasetName: string;
  apiUrl: string;
  frequency: "daily" | "weekly";
  nextRun: string | null;
  createdAt: string;
};

function dedupeMonitoringConfigs(configs: MonitoringConfig[]) {
  const byId = new Map<number, MonitoringConfig>();
  for (const config of configs) {
    byId.set(config.id, config);
  }

  return Array.from(byId.values());
}

const MONITORING_STORAGE_KEY = "judgeNet:monitoringConfigs";

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not scheduled";
  }

  return date.toLocaleString();
}

function statusForConfig(config: MonitoringConfig, now: number) {
  if (!config.nextRun) {
    return { label: "Manual", tone: "bg-slate-100 text-slate-700 border-slate-200" };
  }

  const nextRun = new Date(config.nextRun).getTime();
  if (Number.isNaN(nextRun)) {
    return { label: "Scheduled", tone: "bg-slate-100 text-slate-700 border-slate-200" };
  }

  if (nextRun <= now) {
    return { label: "Due now", tone: "bg-amber-50 text-amber-700 border-amber-200" };
  }

  return { label: "Scheduled", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" };
}

export function ProductDashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [apiUrl, setApiUrl] = useState("");
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeApiResponse | null>(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [monitoringMessage, setMonitoringMessage] = useState<string | null>(null);
  const [monitoringConfigs, setMonitoringConfigs] = useState<MonitoringConfig[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [deletingJobId, setDeletingJobId] = useState<number | null>(null);

  useEffect(() => {
    try {
      const storedConfigs = window.localStorage.getItem(MONITORING_STORAGE_KEY);
      if (storedConfigs) {
        const parsed = JSON.parse(storedConfigs) as Array<MonitoringConfig & { jobId?: number }>;
        if (Array.isArray(parsed)) {
          const normalized = parsed
            .map((item) => {
              const id =
                typeof item.id === "number"
                  ? item.id
                  : typeof item.jobId === "number"
                    ? item.jobId
                    : Number.NaN;

              if (!Number.isFinite(id)) {
                return null;
              }

              return {
                id,
                datasetName: item.datasetName,
                apiUrl: item.apiUrl,
                frequency: item.frequency,
                nextRun: item.nextRun,
                createdAt: item.createdAt,
              } as MonitoringConfig;
            })
            .filter((item): item is MonitoringConfig => item !== null);

          setMonitoringConfigs(dedupeMonitoringConfigs(normalized));
        }
      }

    } catch {
      window.localStorage.removeItem(MONITORING_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(MONITORING_STORAGE_KEY, JSON.stringify(monitoringConfigs));
  }, [monitoringConfigs]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const buttonLabel = monitoringEnabled ? "Enable Continuous Monitoring" : "Analyze Bias";

  const handleDeleteMonitoringSetup = async (job: MonitoringConfig) => {
    const confirmed = window.confirm("Are you sure you want to delete this monitoring setup?");
    if (!confirmed) {
      return;
    }

    console.log("Deleting job ID:", job.id);

    setDeletingJobId(job.id);
    setError(null);
    setMonitoringMessage(null);

    try {
      const response = await fetch(`/api/delete-job/${job.id}`, {
        method: "DELETE",
      });

      const data = (await response.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!response.ok || !data.success) {
        if (response.status === 404 && typeof data.error === "string" && /not found/i.test(data.error)) {
          setMonitoringConfigs((previous) => previous.filter((item) => item.id !== job.id));
          setMonitoringMessage("Monitoring setup deleted");
          return;
        }

        throw new Error(data.error ?? "Failed to delete monitoring setup");
      }

      setMonitoringConfigs((previous) => previous.filter((item) => item.id !== job.id));
      setMonitoringMessage("Monitoring setup deleted");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete monitoring setup");
    } finally {
      setDeletingJobId(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Please choose a dataset file first.");
      return;
    }

    const allowedExtensions = ["csv", "tsv", "txt", "xls", "xlsx", "xsl"];
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      setError("Unsupported file type. Please upload a CSV, TSV, TXT, XLS, XLSX, or XSL dataset.");
      return;
    }

    setAnalysisResult(null);
    setHasAnalyzed(false);
    setError(null);
    setMonitoringMessage(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const resolvedApiUrl = apiUrl.trim() || "http://localhost:8000/predict";

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("Upload endpoint is unavailable.");
      }

      const uploadData = (await uploadRes.json()) as {
        datasetPath?: string;
        error?: string;
      };

      if (!uploadData.datasetPath) {
        throw new Error(uploadData.error ?? "Upload failed");
      }

      const analyzeRes = await fetch("/api/detect-bias", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          datasetPath: uploadData.datasetPath,
          api_url: resolvedApiUrl,
        }),
      });

      if (!analyzeRes.ok) {
        const analyzeErrorData = (await analyzeRes.json().catch(() => ({ error: "Analysis endpoint failed" }))) as {
          error?: string;
        };
        throw new Error(analyzeErrorData.error ?? "Analysis failed");
      }

      const analyzeData = (await analyzeRes.json()) as AnalyzeApiResponse;
      if (!analyzeData.success) {
        throw new Error(analyzeData.error ?? "Analysis failed");
      }

      setAnalysisResult(analyzeData);
      setHasAnalyzed(true);

      if (!monitoringEnabled) {
        return;
      }

      const createJobRes = await fetch("/api/create-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dataset_path: uploadData.datasetPath,
          api_url: resolvedApiUrl,
          frequency,
        }),
      });

      const createJobData = (await createJobRes.json().catch(() => ({}))) as CreateJobResponse;

      if (!createJobRes.ok || !createJobData.success) {
        throw new Error(createJobData.error ?? "Failed to create monitoring setup");
      }

      const config: MonitoringConfig = {
        id: createJobData.job_id,
        datasetName: file.name,
        apiUrl: apiUrl.trim() || "Local default model",
        frequency,
        nextRun: createJobData.next_run ?? null,
        createdAt: new Date().toISOString(),
      };

      setMonitoringConfigs((previous) => [config, ...previous.filter((item) => item.id !== config.id)]);
      setMonitoringMessage("Monitoring enabled and initial analysis completed");
    } catch (submitError) {
      if (submitError instanceof Error && submitError.message === "Failed to fetch") {
        setError("Failed to reach the backend. Make sure the Next.js app and Flask API are both running.");
      } else {
        setError(submitError instanceof Error ? submitError.message : "Unexpected error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const analysisMetrics = analysisResult
    ? [
        {
          label: "Statistical Parity Difference",
          value: analysisResult.metrics.statistical_parity_difference,
        },
        {
          label: "Disparate Impact",
          value: analysisResult.metrics.disparate_impact,
        },
        {
          label: "Mean Difference",
          value: analysisResult.metrics.mean_difference,
        },
        {
          label: "Equal Opportunity Difference",
          value: analysisResult.metrics.equal_opportunity_difference ?? null,
        },
        {
          label: "Average Odds Difference",
          value: analysisResult.metrics.average_odds_difference ?? null,
        },
      ]
    : [];

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null);
    setAnalysisResult(null);
    setHasAnalyzed(false);
    setError(null);
    setMonitoringMessage(null);
  };

  return (
    <section className="min-h-screen px-4 py-12 md:py-16 flex items-center justify-center bg-[#F8FAFC]">
      <div className="w-full max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
              J
            </div>
            <span className="text-lg font-serif font-bold tracking-tight text-slate-900">JudgeNet</span>
          </div>
          <h1 className="mt-5 text-4xl md:text-5xl font-serif font-bold text-slate-900">Bias Analyzer</h1>
          <p className="mt-4 text-slate-600 text-base md:text-lg max-w-2xl mx-auto">
            Run a one-time fairness check or turn on continuous monitoring for a dataset and model API.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              href="/monitoring"
              className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              Go to Monitoring Dashboard
            </Link>
          </div>
        </div>

        <Card className="border-slate-200/70 shadow-2xl bg-white">
          <CardHeader className="px-6 md:px-8 py-5 border-b border-slate-100">
            <CardTitle className="text-lg font-serif font-bold text-slate-900">Monitoring Setup</CardTitle>
          </CardHeader>
          <CardContent className="px-6 md:px-8 py-8">
            <div className="space-y-6">
              <label className="flex items-center gap-3 text-sm font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={monitoringEnabled}
                  onChange={(event) => setMonitoringEnabled(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                Enable continuous monitoring
              </label>

              {monitoringEnabled ? (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(event) => setFrequency(event.target.value as "daily" | "weekly")}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                  Dataset file
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".csv,.tsv,.txt,.xls,.xlsx,.xsl"
                  className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                  Model API URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://api.model.example.com/predict"
                  value={apiUrl}
                  onChange={(event) => setApiUrl(event.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Leave this empty to use the backend default model endpoint.
                </p>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full h-12 rounded-full bg-slate-900 text-white hover:bg-slate-800"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {monitoringEnabled ? "Running analysis and enabling monitoring..." : "Analyzing..."}
                  </span>
                ) : (
                  buttonLabel
                )}
              </Button>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              {monitoringMessage ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4" />
                  <span>{monitoringMessage}</span>
                </div>
              ) : null}

              {hasAnalyzed ? (
                analysisResult ? (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 md:p-6">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-slate-600" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Analysis Results</h2>
                  </div>

                  <div className="grid gap-3">
                    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Protected Attribute</div>
                      <div className="mt-1 text-sm font-medium text-slate-900">{analysisResult.detected_protected}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Variable</div>
                      <div className="mt-1 text-sm font-medium text-slate-900">{analysisResult.detected_target}</div>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {analysisMetrics.map((metric) => (
                      <div key={metric.label} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{metric.label}</div>
                        <div className="mt-1 text-sm font-medium text-slate-900">
                          {metric.value === null || metric.value === undefined ? "Not computable" : metric.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Verdict</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {analysisResult.bias_comparison?.verdict ?? (analysisResult.severity === "HIGH" ? "High bias" : "Low bias")}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Short Explanation</div>
                    <div className="mt-1 text-sm leading-relaxed text-slate-700">
                      {analysisResult.insight ?? "The analysis completed successfully."}
                    </div>
                  </div>
                </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-6 text-sm text-slate-500">
                    Run analysis to view results.
                  </div>
                )
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-6 text-sm text-slate-500">
                  Run analysis to view results.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-serif font-bold text-slate-900">Monitoring Configurations</h2>
            <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
              {monitoringConfigs.length} saved
            </Badge>
          </div>

          <div className="space-y-3">
            {monitoringConfigs.length ? (
              monitoringConfigs.map((config) => {
                const status = statusForConfig(config, currentTime);

                return (
                  <Card key={config.id} className="border-slate-200/70 bg-white shadow-sm">
                    <CardContent className="p-4 md:p-5">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Monitoring Setup #{config.id}</div>
                          <div className="mt-1 text-sm text-slate-600">{config.datasetName}</div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1">
                              <Clock3 className="h-3 w-3" />
                              {config.frequency}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-slate-200 px-2.5 py-1">
                              Next run: {formatDateTime(config.nextRun)}
                            </span>
                          </div>
                        </div>

                        <Badge variant="outline" className={status.tone}>
                          {status.label}
                        </Badge>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteMonitoringSetup(config)}
                          disabled={deletingJobId === config.id}
                          className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                        >
                          {deletingJobId === config.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card className="border-dashed border-slate-200 bg-white/70">
                <CardContent className="p-6 text-sm text-slate-500">
                  No monitoring setups yet
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}