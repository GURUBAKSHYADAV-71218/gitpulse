import { promises as fs } from "fs";
import path from "path";
import type { ScanHistoryEntry, ScanRecord } from "../types";
import { decodeScanToken } from "../scanEncoding";

// ---------------------------------------------------------------------------
// CORE SCAN RETRIEVAL: fully stateless, works identically in dev and on Vercel
// ---------------------------------------------------------------------------
// A scan's `id` IS the complete encoded scan result (see lib/scanEncoding.ts).
// getScan() below never touches the filesystem or any external store — it
// only decodes the id. This is what the rest of this file's local-history
// feature can safely be missing/broken without ever affecting it.
// ---------------------------------------------------------------------------

export async function getScan(id: string): Promise<ScanRecord | null> {
  return decodeScanToken(id);
}

// ---------------------------------------------------------------------------
// LOCAL DEVELOPMENT HISTORY ONLY — not relied upon in production
// ---------------------------------------------------------------------------
// Vercel serverless functions run on an ephemeral, often read-only
// filesystem with no shared state between invocations or instances. A
// JSON-file "database" cannot be relied on there. History below is
// explicitly a local dev convenience:
//   - Disabled automatically when running on Vercel (VERCEL env var is set
//     by the platform itself, so no extra config is required).
//   - Every filesystem operation is wrapped so a failure here can NEVER
//     throw out of the scan flow — recording history is fire-and-forget
//     and best-effort by design.
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "scans.json");
const MAX_STORED_SCANS = 200;

/** True when running in a serverless environment where local disk writes cannot be relied on. */
export const localHistoryEnabled = !process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME;

let memoryCache: ScanHistoryEntry[] | null = null;

async function ensureDataFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf-8");
  }
}

async function readAll(): Promise<ScanHistoryEntry[]> {
  if (!localHistoryEnabled) return [];
  if (memoryCache) return memoryCache;
  try {
    await ensureDataFile();
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    memoryCache = JSON.parse(raw) as ScanHistoryEntry[];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[scanStore] Failed to read local scan history (non-fatal):", err);
    memoryCache = [];
  }
  return memoryCache;
}

async function writeAll(entries: ScanHistoryEntry[]): Promise<void> {
  memoryCache = entries;
  if (!localHistoryEnabled) return;
  try {
    await ensureDataFile();
    await fs.writeFile(DATA_FILE, JSON.stringify(entries, null, 2), "utf-8");
  } catch (err) {
    // A failed local-history write must NEVER surface as a scan failure.
    // eslint-disable-next-line no-console
    console.error("[scanStore] Failed to persist local scan history (non-fatal):", err);
  }
}

/**
 * Records a scan in local dev history. Best-effort, non-blocking for
 * callers, and guaranteed never to throw — call this fire-and-forget
 * (`void recordScanForLocalHistory(scan)`), never awaited on the critical
 * path of returning a scan result to the user.
 */
export async function recordScanForLocalHistory(scan: ScanRecord): Promise<void> {
  if (!localHistoryEnabled) return;
  try {
    const entries = await readAll();
    entries.unshift({ id: scan.id, createdAt: scan.createdAt, source: scan.source, overallScore: scan.health.overall });
    if (entries.length > MAX_STORED_SCANS) entries.length = MAX_STORED_SCANS;
    await writeAll(entries);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[scanStore] Failed to record scan in local history (non-fatal):", err);
  }
}

export async function listScanHistory(): Promise<ScanHistoryEntry[]> {
  return readAll();
}
