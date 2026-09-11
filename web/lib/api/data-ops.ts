// DATA-OPS — CSV import and the AI agent.
//
// One of the five door lists behind `@/lib/api`. They are split by WORKER,
// because that is the boundary the doors already have: a path under
// `/api/data-ops/…` is answered by the data-ops worker and nothing else.
//
// THE WHOLE DIRECTORY IS THE ATTACK SURFACE the two gateway suites derive from —
// workers/gateway/test/agency-door.test.ts walks every file here to prove each
// door reaches a worker, and workers/portal-gateway/test/portal-door.test.ts
// walks the same files to prove none of them reaches the CLIENT door. They read
// the DIRECTORY, not one file, so a door added in a new domain file is covered
// the day it lands.

import type {
  AgentMessage,
  AgentQuota,
  AgentThread,
  ChatOutcome,
  ImportBatchReport,
  ImportBatchSummary,
  ImportBatchView,
  ImportableTarget,
  PendingCall,
} from "@shared/types"
import { api, enc, post } from "@shared/web/api"
import { streamSse, type AgentStreamEvent } from "./stream"

/** One row of the agent usage log (written once per turn): who ran it, when, how
 * many AI units it used, whether that was free / credit / mixed, and a short line.
 * `kind` says what the summary IS — an action taken (team-visible) or the author's
 * own prompt (redacted to null on teammates' rows; NULL kind = legacy, private). */
export type UsageLogRow = {
  id: string
  createdAt: string
  actorName?: string
  credits: number
  source: string
  summary: string | null
  kind?: "action" | "prompt" | null
}

/** Data-ops worker — the agentic file import + the AI agent. */
export const dataOps = {
  /** TRANSLATE A TICKET'S TITLE AND SET IT (never a preview). Spends one unit of
   * the team's daily AI allowance and refunds it if nothing usable came back. */
  translateTicket: (id: string) =>
    api<{ translated: boolean; alreadyEnglish: boolean; titleEn: string }>(
      "/api/data-ops/agent/translate-ticket",
      post({ id })
    ),

  /** READ A SCREEN'S HUMAN-TYPED TEXT IN YOUR OWN LANGUAGE. One press, one
   * request, one unit of the team's allowance — the whole screen's pieces go in
   * one array and come back in the same order. Nothing is written: the record
   * still says exactly what its author typed, and the reader can put the
   * original back at any time.
   *
   * `partial` is the door saying it could not do all of it: the pieces it could
   * not translate come back as what was typed, and the screen has to say so
   * rather than show German to somebody who asked for English. */
  translateText: (texts: string[], language: string) =>
    api<{ language: string; translations: string[]; partial: boolean }>(
      "/api/data-ops/agent/translate",
      post({ texts, language })
    ),
  importTargets: () => api<{ targets: ImportableTarget[] }>("/api/data-ops/import/targets"),

  /** A downloadable sample CSV href for a target — a good-file template. */
  importSampleHref: (tableKey: string) => `/api/data-ops/import/sample?tableKey=${enc(tableKey)}`,
  // Agentic multi-file batch import (AGENTIC-IMPORT.md).
  batchStart: () => api<{ batch: ImportBatchView }>("/api/data-ops/import/batch", post({})),
  batchAddFile: (batchId: string, name: string, csv: string) =>
    api<{ batch: ImportBatchView }>("/api/data-ops/import/batch/file", post({ batchId, name, csv })),
  batchPlan: (batchId: string) =>
    api<{ batch: ImportBatchView; quota: AgentQuota }>("/api/data-ops/import/batch/plan", post({ batchId })),
  importBatches: () => api<{ batches: ImportBatchSummary[] }>("/api/data-ops/import/batches"),
  /** `groups` NARROWS THE RUN to named dropdown groups — what a module's own
   * settings page sends, so an import started from Settings › Tickets adds
   * ticket types and skips everything else in the file with a reason. Omitted
   * everywhere else, which is an unscoped run and the door's historic answer.
   * The door is what enforces it (workers/data-ops/src/routes/import.ts); this
   * only carries it. */
  batchConfirm: (batchId: string, groups?: string[]) =>
    api<{ report: ImportBatchReport }>("/api/data-ops/import/batch/confirm", post({ batchId, groups })),
  /** Pick up a run that did not finish, from its last checkpoint. Same answer
   * shape as `batchConfirm` — the report covers the whole import, not the leg —
   * and the same scope, said again: the door does not remember one from the leg
   * it is picking up, on purpose, so a resume that dropped it would finish a
   * narrowed import unnarrowed. */
  batchContinue: (batchId: string, groups?: string[]) =>
    api<{ report: ImportBatchReport }>("/api/data-ops/import/batch/continue", post({ batchId, groups })),
  batchGet: (id: string) => api<{ batch: ImportBatchView }>(`/api/data-ops/import/batch?id=${enc(id)}`),

  agentUsage: () => api<{ quota: AgentQuota }>("/api/data-ops/agent/usage"),
  /** The team's agent usage log — one row per turn, newest-first. Powers the
   * "where did my credits go" view behind the quota badge. */
  agentUsageLog: (limit?: number) =>
    api<{ rows: UsageLogRow[] }>(
      "/api/data-ops/agent/usage-log" + (limit ? `?limit=${limit}` : "")
    ),
  agentChat: (message: string, threadId?: string) =>
    api<ChatOutcome>("/api/data-ops/agent/chat", post({ message, threadId })),
  agentConfirm: (threadId: string, approve: boolean, calls: PendingCall[]) =>
    api<{ reply: string; quota: AgentQuota; overQuota?: boolean }>(
      "/api/data-ops/agent/confirm",
      post({ threadId, approve, calls })
    ),

  /** Streaming chat turn: text arrives word-by-word, each tool run bookended by
   * step_start/step_end, ending in one terminal event (confirm | final | error).
   * The non-streaming agentChat above stays as a fallback. */
  agentChatStream: (
    body: {
      message: string
      threadId?: string
      files?: { name: string; csv: string }[]
      /** WHICH DOORS this conversation may read the knowledge base through — the
       * source chips, as chip keys. Omitted means all of them. It is ENFORCED at
       * the executor rather than described to the model, so a door left out
       * cannot be read from however the assistant phrases its own call. */
      sources?: string[]
    },
    onEvent: (ev: AgentStreamEvent) => void
  ) => streamSse("/api/data-ops/agent/chat", body, onEvent),

  /** Streaming confirm continuation — approving a paused turn resumes it as a
   * stream too, so steps accumulate across the confirm boundary. */
  agentConfirmStream: (
    body: { threadId: string; approve: boolean; calls: PendingCall[] },
    onEvent: (ev: AgentStreamEvent) => void
  ) => streamSse("/api/data-ops/agent/confirm", body, onEvent),
  agentThreads: () => api<{ threads: AgentThread[] }>("/api/data-ops/agent/threads"),
  agentThread: (id: string) =>
    api<{ messages: AgentMessage[] }>(`/api/data-ops/agent/thread?id=${enc(id)}`),
}

/** The MCP front desk (personal access tokens; the /mcp endpoint itself is for
 * machines with a Bearer token, not this session client). */
