"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Github, Upload, ArrowRight, FileWarning } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScanProgress } from "@/components/scan/ScanProgress";

type Mode = "github" | "upload";
type Status = "idle" | "loading" | "error";

export function ScanFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode: Mode = searchParams.get("mode") === "upload" ? "upload" : "github";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [githubUrl, setGithubUrl] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(file: File) {
    setError(null);
    if (!file.name.endsWith(".json") && file.type !== "application/json") {
      setError("Please upload a .json file (your project's package.json).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("File exceeds the 2MB upload limit.");
      return;
    }
    const text = await file.text();
    setFileName(file.name);
    setFileContent(text);
  }

  async function submitGithub() {
    if (!githubUrl.trim()) {
      setError("Please enter a GitHub repository URL.");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/analyze/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: githubUrl.trim() })
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus("error");
        setError(json.error ?? "Analysis failed.");
        return;
      }
      router.push(`/dashboard/${json.scanId}/overview`);
    } catch {
      setStatus("error");
      setError("Network error. Please check your connection and try again.");
    }
  }

  async function submitPackageJson() {
    if (!fileContent) {
      setError("Please select a package.json file first.");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/analyze/package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileContent })
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus("error");
        setError(json.error ?? "Analysis failed.");
        return;
      }
      router.push(`/dashboard/${json.scanId}/overview`);
    } catch {
      setStatus("error");
      setError("Network error. Please check your connection and try again.");
    }
  }

  if (status === "loading") {
    return (
      <Card>
        <CardBody className="space-y-6 py-10">
          <div className="text-center">
            <p className="font-display text-base font-medium text-ink">Analyzing…</p>
            <p className="mt-1 text-sm text-ink-muted">This usually takes 10–40 seconds.</p>
          </div>
          <ScanProgress mode={mode === "github" ? "github" : "package"} inFlight={status === "loading"} />
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-line bg-bg-surface p-1">
        <button
          onClick={() => {
            setMode("github");
            setError(null);
          }}
          className={clsx(
            "focus-ring flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-colors",
            mode === "github" ? "bg-bg-raised text-ink" : "text-ink-muted hover:text-ink"
          )}
        >
          <Github className="h-4 w-4" />
          GitHub Repository
        </button>
        <button
          onClick={() => {
            setMode("upload");
            setError(null);
          }}
          className={clsx(
            "focus-ring flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-colors",
            mode === "upload" ? "bg-bg-raised text-ink" : "text-ink-muted hover:text-ink"
          )}
        >
          <Upload className="h-4 w-4" />
          Upload package.json
        </button>
      </div>

      <Card>
        <CardBody className="space-y-4">
          {mode === "github" ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-ink" htmlFor="github-url">
                GitHub repository URL
              </label>
              <input
                id="github-url"
                type="text"
                placeholder="https://github.com/owner/repository"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitGithub()}
                className="focus-ring w-full rounded-md border border-line bg-bg-raised px-3.5 py-2.5 font-mono text-sm text-ink placeholder:text-ink-faint"
              />
              <p className="text-xs text-ink-faint">Public repositories only. GitPulse never executes repository code.</p>
              <Button onClick={submitGithub} className="w-full">
                Analyze Repository
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-ink">package.json file</label>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="focus-ring flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line px-6 py-10 text-center hover:border-ink-faint"
              >
                <Upload className="h-6 w-6 text-ink-faint" strokeWidth={1.5} />
                <span className="text-sm text-ink">{fileName ?? "Click to select package.json"}</span>
                <span className="text-xs text-ink-faint">JSON files up to 2MB</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
              <Button onClick={submitPackageJson} className="w-full" disabled={!fileContent}>
                Analyze package.json
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-status-critical/30 bg-status-critical/5 px-3 py-2.5 text-sm text-status-critical">
              <FileWarning className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
