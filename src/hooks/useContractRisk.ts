import { useEffect, useRef, useState } from "react";
import { contractRiskService, type ContractRiskOverview, type ContractRiskOutput, type ContractRiskRunStatus } from "@/services/contractRiskService";

const AGENT_KEY = "contract_risk_dispute_settlement";

export type ContractRiskUiState = "idle" | "loading" | "analyzing" | "done" | "error";
export type ContractRiskDiagnostics = {
  lastStartStatus?: string | null;
  lastStartRunId?: string | null;
  lastPollStatus?: string | null;
  lastPollStage?: string | null;
  lastPollError?: string | null;
  lastOverviewStatus?: string | null;
};

export function useContractRisk(caseId?: string, selectedRunId?: string) {
  const [state, setState] = useState<ContractRiskUiState>("loading");
  const [overview, setOverview] = useState<ContractRiskOverview | null>(null);
  const [output, setOutput] = useState<ContractRiskOutput | null>(null);
  const [runStatus, setRunStatus] = useState<ContractRiskRunStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<ContractRiskDiagnostics>({});
  const pollTimer = useRef<number | null>(null);
  const mounted = useRef(true);
  const pollingRunIdRef = useRef<string | null>(null);
  const pollRequestInFlightRef = useRef(false);
  const isDoneStatus = (value?: string | null) => ["SUCCEEDED", "DONE", "SUCCESS"].includes(String(value || "").toUpperCase());
  const isErrorStatus = (value?: string | null) => ["FAILED", "ERROR", "CANCELLED", "ABORTED"].includes(String(value || "").toUpperCase());
  const storageKey = caseId ? `contract-risk-run:${caseId}:${AGENT_KEY}` : "";

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (pollTimer.current) window.clearTimeout(pollTimer.current);
    };
  }, []);

  async function loadOverview(opts?: { forceRunCheck?: boolean }) {
    if (!caseId) return;
    setState((s) => (s === "analyzing" ? s : "loading"));
    setError(null);
    try {
      const data = await contractRiskService.getOverview(caseId, selectedRunId);
      if (!mounted.current) return;
      setOverview(data);
      setDiagnostics((d) => ({ ...d, lastOverviewStatus: data.latest_output_status || null }));
      if ((data.latest_output_status === "done" || data.latest_output_status === "blocked") && data.latest_output) {
        setOutput(data.latest_output);
        setState("done");
        setRunStatus(null);
        if (storageKey) sessionStorage.removeItem(storageKey);
        pollingRunIdRef.current = null;
      } else if (data.latest_output && data.latest_output_status === "error") {
        setOutput(data.latest_output);
        setState("done");
        setRunStatus(null);
        if (storageKey) sessionStorage.removeItem(storageKey);
        pollingRunIdRef.current = null;
      } else if (data.latest_output_status === "running" && data.latest_run_id) {
        setState("analyzing");
        if (pollingRunIdRef.current !== data.latest_run_id) {
          void poll(data.latest_run_id);
        }
      } else {
        setOutput(null);
        setState("idle");
      }
      return data;
    } catch (e) {
      if (!mounted.current) return;
      setError(e instanceof Error ? e.message : "Failed to load contract risk overview");
      setState("error");
      return null;
    }
  }

  async function poll(runId: string) {
    if (!caseId) return;
    if (pollRequestInFlightRef.current && pollingRunIdRef.current === runId) return;
    pollingRunIdRef.current = runId;
    pollRequestInFlightRef.current = true;
    try {
      const status = await contractRiskService.getRunStatus(runId);
      if (!mounted.current) return;
      setRunStatus(status);
      setDiagnostics((d) => ({
        ...d,
        lastPollStatus: status.status || null,
        lastPollStage: status.stage || null,
        lastPollError: status.error || null,
      }));
      if (isDoneStatus(status.status) || status.done === true) {
        const out = await contractRiskService.getOutput(caseId, runId);
        if (!mounted.current) return;
        setOutput(out);
        setState("done");
        sessionStorage.removeItem(storageKey);
        pollingRunIdRef.current = null;
        await loadOverview();
        return;
      }
      if (isErrorStatus(status.status)) {
        const runError = status.error || (status as any).error_message || "Contract risk analysis failed";
        try {
          const out = await contractRiskService.getOutput(caseId, runId);
          if (!mounted.current) return;
          if (out) {
            setOutput(out);
            setState("done");
          } else {
            setError(runError);
            setState("error");
          }
        } catch {
          if (!mounted.current) return;
          setError(runError);
          setState("error");
        }
        sessionStorage.removeItem(storageKey);
        pollingRunIdRef.current = null;
        return;
      }
      pollTimer.current = window.setTimeout(() => void poll(runId), 700);
    } catch (e) {
      if (!mounted.current) return;
      setError(e instanceof Error ? e.message : "Failed to read run status");
      setState("error");
      pollingRunIdRef.current = null;
    } finally {
      pollRequestInFlightRef.current = false;
    }
  }

  async function startRun(force = false, autoTriggered = false) {
    if (!caseId) return;
    setError(null);
    setState("analyzing");
    try {
      const started = await contractRiskService.startRun(caseId, force);
      if (!mounted.current) return;
      setDiagnostics((d) => ({
        ...d,
        lastStartStatus: started.status || null,
        lastStartRunId: started.run_id || null,
      }));
      if (started.status === "cached" && started.output) {
        setOutput(started.output);
        setState("done");
        pollingRunIdRef.current = null;
        await loadOverview();
        return;
      }
      const runId = started.run_id;
      if (!runId) throw new Error("No run id returned");
      if (!autoTriggered || !runStatus) setRunStatus(null);
      sessionStorage.setItem(storageKey, runId);
      await poll(runId);
    } catch (e) {
      if (!mounted.current) return;
      const message = e instanceof Error ? e.message : "Failed to start analysis";
      setError(message);
      setState("error");
    }
  }

  useEffect(() => {
    if (!caseId) return;
    void (async () => {
      const loadedOverview = await loadOverview({ forceRunCheck: false });
      if (selectedRunId) return;
      const existing = sessionStorage.getItem(storageKey);
      if (!existing || pollingRunIdRef.current === existing) return;
      const currentOverviewStatus = String((loadedOverview?.latest_output_status || "")).toLowerCase();
      if (currentOverviewStatus === "done" || currentOverviewStatus === "blocked") {
        sessionStorage.removeItem(storageKey);
        return;
      }
      setState("analyzing");
      void poll(existing);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, selectedRunId]);

  return {
    state,
    overview,
    output,
    runStatus,
    error,
    diagnostics,
    reload: () => loadOverview(),
    startRun,
    exportUrl: caseId ? contractRiskService.getExportUrl(caseId) : "",
  };
}
