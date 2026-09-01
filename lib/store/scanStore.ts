import { promises as fs } from "fs";
import path from "path";
import type { ScanHistoryEntry, ScanRecord } from "../types";

// GitPulse's scan store is intentionally a small, swappable abstraction.
// In development (no DATABASE_URL configured) it persists scans to a local
// JSON file so scan history survives dev-server restarts. In production,
// this module is the single integration point for a relational database
// (see README "Persistence" section for the suggested Postgres schema:
// repositories, scans, dependencies, vulnerabilities, contributors,
// recommendations, category_scores, scan_history). Nothing outside this
// file needs to know which backend is active.

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "scans.json");

// Cap history size in the file-backed store to avoid unbounded growth in a
// long-running dev environment.
const MAX_STORED_SCANS = 200;

let memoryCache: ScanRecord[] | null = null;

async function ensureDataFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf-8");
  }
}

async function readAll(): Promise<ScanRecord[]> {
  if (memoryCache) return memoryCache;
  await ensureDataFile();
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    memoryCache = JSON.parse(raw) as ScanRecord[];
  } catch {
    memoryCache = [];
  }
  return memoryCache;
}

async function writeAll(scans: ScanRecord[]): Promise<void> {
  memoryCache = scans;
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(scans, null, 2), "utf-8");
}

export async function saveScan(scan: ScanRecord): Promise<void> {
  const scans = await readAll();
  scans.unshift(scan);
  if (scans.length > MAX_STORED_SCANS) scans.length = MAX_STORED_SCANS;
  await writeAll(scans);
}

export async function getScan(id: string): Promise<ScanRecord | null> {
  const scans = await readAll();
  return scans.find((s) => s.id === id) ?? null;
}

export async function listScanHistory(sourceLabel?: string): Promise<ScanHistoryEntry[]> {
  const scans = await readAll();
  const filtered = sourceLabel ? scans.filter((s) => s.source.label === sourceLabel) : scans;
  return filtered.map((s) => ({
    id: s.id,
    createdAt: s.createdAt,
    source: s.source,
    overallScore: s.health.overall
  }));
}

export async function getPreviousScanForSource(sourceLabel: string): Promise<ScanRecord | null> {
  const scans = await readAll();
  return scans.find((s) => s.source.label === sourceLabel) ?? null;
}
