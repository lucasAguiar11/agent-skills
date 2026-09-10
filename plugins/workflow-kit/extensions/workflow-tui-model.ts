import type { EfficiencyLedger } from "./ledger";
import type { WorkflowEvent } from "./protocol";

export interface WorkflowTuiSnapshot {
  entries: readonly unknown[];
  events: readonly WorkflowEvent[];
  ledger: EfficiencyLedger;
}

export type WorkflowTuiMode = "timeline" | "agents";

export interface WorkflowTuiRow {
  id: string;
  kind: "message" | "tool" | "event" | "agent" | "empty";
  title: string;
  subtitle: string;
  detail: string;
  timestamp?: string;
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function jsonValue(value: unknown): string {
  try {
    const result = JSON.stringify(value, null, 2);
    return result === undefined ? String(value) : result;
  } catch {
    return String(value);
  }
}

function compact(value: string, length = 120): string {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function contentText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((block) => {
    const item = objectValue(block);
    if (!item) return "";
    if (typeof item.text === "string") return item.text;
    if (typeof item.name === "string") {
      const argumentsText = item.arguments === undefined ? "" : ` ${compact(jsonValue(item.arguments), 80)}`;
      return `${item.name}${argumentsText}`;
    }
    return typeof item.type === "string" ? `[${item.type}]` : "";
  }).filter(Boolean).join(" ");
}

function timestamp(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function messageRow(entry: Record<string, unknown>, index: number): WorkflowTuiRow {
  const message = objectValue(entry.message) ?? {};
  const role = typeof message.role === "string" ? message.role : "message";
  const text = contentText(message.content);
  const kind = role === "toolResult" ? "tool" : "message";
  return {
    id: `message:${String(entry.id ?? index)}`,
    kind,
    title: `${role}: ${compact(text || "(sem conteúdo)")}`,
    subtitle: "session message",
    detail: jsonValue(entry),
    timestamp: timestamp(entry.timestamp) ?? timestamp(message.timestamp),
  };
}

function entryRow(entry: Record<string, unknown>, index: number): WorkflowTuiRow | undefined {
  if (entry.type === "message") return messageRow(entry, index);
  if (entry.type === "custom" && entry.customType === "workflow-kit:protocol:v1") return undefined;
  const type = typeof entry.type === "string" ? entry.type : "entry";
  const customType = typeof entry.customType === "string" ? ` · ${entry.customType}` : "";
  return {
    id: `entry:${String(entry.id ?? index)}`,
    kind: type.includes("tool") ? "tool" : "event",
    title: `${type}${customType}`,
    subtitle: "session entry",
    detail: jsonValue(entry),
    timestamp: timestamp(entry.timestamp),
  };
}

function eventRow(event: WorkflowEvent, index: number): WorkflowTuiRow {
  let title: string;
  let subtitle: string;
  if (event.type === "spawn.request") {
    title = `task ${event.workstream}: ${compact(event.goal)}`;
    subtitle = `spawn · ${event.tier} · attempt ${event.attempt}`;
  } else if (event.type === "agent.lifecycle") {
    title = `${event.agent}: ${event.status}`;
    subtitle = `agent · ${event.workstream}`;
  } else if (event.type === "verdict") {
    title = `verdict: ${event.status}`;
    subtitle = `verdict · ${event.workstream}`;
  } else if (event.type === "handoff") {
    title = `handoff: ${event.status}`;
    subtitle = `handoff · ${event.workstream}`;
  } else if (event.type === "checkpoint") {
    title = `checkpoint: ${compact(event.goal)}`;
    subtitle = `checkpoint · ${event.workstream}`;
  } else {
    title = `blocked: ${compact(event.reason)}`;
    subtitle = `blocked · ${event.workstream}`;
  }
  return {
    id: `event:${event.id}:${index}`,
    kind: event.type === "agent.lifecycle" ? "agent" : "event",
    title,
    subtitle,
    detail: jsonValue(event),
    timestamp: timestamp(event.at),
  };
}

function emptyRow(mode: WorkflowTuiMode): WorkflowTuiRow {
  return {
    id: `empty:${mode}`,
    kind: "empty",
    title: mode === "timeline" ? "Nenhuma mensagem ou tarefa registrada" : "Nenhum agent registrado",
    subtitle: "workflow session",
    detail: "Abra o TUI durante ou depois de uma execução com /workflow.",
  };
}

function timelineRows(snapshot: WorkflowTuiSnapshot): WorkflowTuiRow[] {
  const rows: Array<{ row: WorkflowTuiRow; order: number }> = [];
  snapshot.entries.forEach((raw, index) => {
    const entry = objectValue(raw);
    const row = entry ? entryRow(entry, index) : undefined;
    if (row) rows.push({ row, order: index });
  });
  snapshot.events.forEach((event, index) => {
    rows.push({ row: eventRow(event, index), order: snapshot.entries.length + index });
  });
  rows.sort((left, right) => {
    const leftTime = left.row.timestamp;
    const rightTime = right.row.timestamp;
    return leftTime && rightTime && leftTime !== rightTime
      ? leftTime.localeCompare(rightTime)
      : left.order - right.order;
  });
  return rows.map(({ row }) => row);
}

function agentRows(snapshot: WorkflowTuiSnapshot): WorkflowTuiRow[] {
  const grouped = new Map<string, WorkflowEvent[]>();
  snapshot.events.forEach((event) => {
    const items = grouped.get(event.workstream) ?? [];
    items.push(event);
    grouped.set(event.workstream, items);
  });
  return [...grouped.entries()].map(([workstream, events]) => {
    const spawn = events.find((event): event is Extract<WorkflowEvent, { type: "spawn.request" }> => event.type === "spawn.request");
    const lifecycle = [...events].reverse().find((event): event is Extract<WorkflowEvent, { type: "agent.lifecycle" }> => event.type === "agent.lifecycle");
    const agent = lifecycle?.agent ?? "agent pending";
    const status = lifecycle?.status ?? "spawned";
    return {
      id: `agent:${workstream}`,
      kind: "agent",
      title: `${workstream}: ${status}`,
      subtitle: `${agent} · ${events.length} eventos${spawn ? ` · ${compact(spawn.goal, 70)}` : ""}`,
      detail: jsonValue(events),
      timestamp: timestamp(events[0]?.at),
    };
  });
}

export function buildWorkflowTuiRows(snapshot: WorkflowTuiSnapshot, mode: WorkflowTuiMode): WorkflowTuiRow[] {
  const rows = mode === "timeline" ? timelineRows(snapshot) : agentRows(snapshot);
  return rows.length ? rows : [emptyRow(mode)];
}
