/**
 * Debt Tracker - Technical debt management
 *
 * Tracks technical debt with mandatory repayment dates,
 * severity levels, and token cost estimates.
 * Stored as JSON in .cortex/debt.json.
 */

import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export type DebtSeverity = 'P0' | 'P1' | 'P2';
export type DebtStatus = 'open' | 'in_progress' | 'resolved';

export interface TechDebt {
  id: string;
  description: string;
  created_at: number;
  repayment_date: number;
  severity: DebtSeverity;
  token_cost: number;
  files_affected: string[];
  status: DebtStatus;
  resolution_tokens?: number;
  resolved_at?: number;
}

export interface DebtStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  overdue: number;
  totalTokenCost: number;
  resolvedTokenCost: number;
  repaymentRate: number;
}

export interface DebtTracker {
  /** Add a new tech debt item */
  add(debt: Omit<TechDebt, 'id' | 'created_at' | 'status'>): Promise<TechDebt>;

  /** List all debts, optionally filtered */
  list(filter?: {
    status?: DebtStatus;
    severity?: DebtSeverity;
    overdue?: boolean;
  }): Promise<TechDebt[]>;

  /** Get a specific debt by ID */
  get(id: string): Promise<TechDebt | null>;

  /** Update debt status */
  resolve(id: string, resolutionTokens?: number): Promise<void>;

  /** Update debt status to in_progress */
  start(id: string): Promise<void>;

  /** Delete a debt item */
  remove(id: string): Promise<void>;

  /** Get debt statistics */
  stats(): Promise<DebtStats>;

  /** Get P0 debts for CLAUDE.md inclusion */
  getCritical(): Promise<TechDebt[]>;

  /** Close (no-op for JSON backend) */
  close(): Promise<void>;
}

interface DebtStore {
  debts: TechDebt[];
}

function loadStore(filePath: string): DebtStore {
  if (!existsSync(filePath)) {
    return { debts: [] };
  }
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return { debts: Array.isArray(data.debts) ? data.debts : [] };
  } catch {
    return { debts: [] };
  }
}

function saveStore(filePath: string, store: DebtStore): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, JSON.stringify(store, null, 2), 'utf-8');
}

/**
 * Create a debt tracker instance backed by a JSON file.
 */
export function createDebtTracker(filePath: string): DebtTracker {
  const store = loadStore(filePath);

  function persist(): void {
    saveStore(filePath, store);
  }

  async function add(debt: Omit<TechDebt, 'id' | 'created_at' | 'status'>): Promise<TechDebt> {
    const id = randomUUID().split('-')[0] || 'debt';
    const created_at = Date.now();

    const newDebt: TechDebt = {
      id,
      created_at,
      status: 'open',
      description: debt.description,
      repayment_date: debt.repayment_date,
      severity: debt.severity,
      token_cost: debt.token_cost,
      files_affected: debt.files_affected,
    };

    store.debts.push(newDebt);
    persist();
    return newDebt;
  }

  async function list(
    filter: { status?: DebtStatus; severity?: DebtSeverity; overdue?: boolean } = {},
  ): Promise<TechDebt[]> {
    let result = [...store.debts];

    if (filter.status) {
      result = result.filter((d) => d.status === filter.status);
    }

    if (filter.severity) {
      result = result.filter((d) => d.severity === filter.severity);
    }

    if (filter.overdue) {
      const now = Date.now();
      result = result.filter((d) => d.repayment_date < now && d.status !== 'resolved');
    }

    // Sort by severity (P0 first) then by repayment date
    const severityOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2 };
    result.sort((a, b) => {
      const sevDiff = (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9);
      if (sevDiff !== 0) return sevDiff;
      return a.repayment_date - b.repayment_date;
    });

    return result;
  }

  async function get(id: string): Promise<TechDebt | null> {
    return store.debts.find((d) => d.id === id) || null;
  }

  async function resolve(id: string, resolutionTokens?: number): Promise<void> {
    const debt = store.debts.find((d) => d.id === id);
    if (!debt) {
      throw new Error(`Debt not found: ${id}`);
    }
    debt.status = 'resolved';
    debt.resolution_tokens = resolutionTokens ?? undefined;
    debt.resolved_at = Date.now();
    persist();
  }

  async function start(id: string): Promise<void> {
    const debt = store.debts.find((d) => d.id === id);
    if (!debt) {
      throw new Error(`Debt not found: ${id}`);
    }
    debt.status = 'in_progress';
    persist();
  }

  async function remove(id: string): Promise<void> {
    store.debts = store.debts.filter((d) => d.id !== id);
    persist();
  }

  async function stats(): Promise<DebtStats> {
    const debts = store.debts;
    const now = Date.now();

    const open = debts.filter((d) => d.status === 'open');
    const inProgress = debts.filter((d) => d.status === 'in_progress');
    const resolved = debts.filter((d) => d.status === 'resolved');
    const overdue = debts.filter((d) => d.status !== 'resolved' && d.repayment_date < now);

    const totalTokenCost = debts.reduce((sum, d) => sum + d.token_cost, 0);
    const resolvedTokenCost = resolved.reduce(
      (sum, d) => sum + (d.resolution_tokens || d.token_cost),
      0,
    );

    const resolvedOnTime = resolved.filter(
      (d) => d.resolved_at && d.resolved_at <= d.repayment_date,
    ).length;
    const repaymentRate = resolved.length > 0 ? resolvedOnTime / resolved.length : 0;

    return {
      total: debts.length,
      open: open.length,
      in_progress: inProgress.length,
      resolved: resolved.length,
      overdue: overdue.length,
      totalTokenCost,
      resolvedTokenCost,
      repaymentRate,
    };
  }

  async function getCritical(): Promise<TechDebt[]> {
    return store.debts.filter((d) => d.severity === 'P0' && d.status !== 'resolved');
  }

  async function close(): Promise<void> {
    // No-op for JSON backend
  }

  return {
    add,
    list,
    get,
    resolve,
    start,
    remove,
    stats,
    getCritical,
    close,
  };
}
