import type { Component } from "@oh-my-pi/pi-tui";
import { replaceTabs, truncateToWidth, visibleWidth, wrapTextWithAnsi } from "@oh-my-pi/pi-tui";
import { buildWorkflowTuiRows, type WorkflowTuiMode, type WorkflowTuiRow, type WorkflowTuiSnapshot } from "./workflow-tui-model";

interface KeybindingsLike {
  matches(data: string, action: string): boolean;
}

type Paint = (color: string, text: string) => string;

const LIST_LINES = 3;
const MAX_DETAIL_LINES = 12;

function detailLineCount(): number {
  const terminalRows = process.stdout.rows ?? 40;
  const maxHeight = Math.min(Math.floor(terminalRows * 0.92), Math.max(1, terminalRows - 2));
  return Math.max(2, Math.min(MAX_DETAIL_LINES, maxHeight - 8 - LIST_LINES * 2));
}

function line(value: string, width: number): string {
  return truncateToWidth(replaceTabs(value), Math.max(1, width));
}

function panelRule(width: number, paint: Paint, left: string, right: string): string {
  return line(paint("border", `${left}${"─".repeat(Math.max(0, width - 2))}${right}`), width);
}

function panelRow(value: string, width: number, paint: Paint): string {
  const innerWidth = Math.max(1, width - 4);
  const content = truncateToWidth(replaceTabs(value), innerWidth);
  return `${paint("border", "│")} ${content}${" ".repeat(Math.max(0, innerWidth - visibleWidth(content)))} ${paint("border", "│")}`;
}

function wrappedDetail(value: string, width: number): string[] {
  return replaceTabs(value).split(/\r?\n/).flatMap((part) => part ? wrapTextWithAnsi(part, Math.max(1, width)) : [""]);
}

export class WorkflowViewer implements Component {
  private mode: WorkflowTuiMode = "timeline";
  private selected = 0;
  private selectedId: string | undefined;
  private detailScroll = 0;
  private cacheKey = "";
  private cache: readonly string[] = [];

  constructor(
    private readonly getSnapshot: () => WorkflowTuiSnapshot,
    private readonly requestRender: () => void,
    private readonly paint: Paint,
    private readonly keybindings: KeybindingsLike,
    private readonly done: () => void,
  ) {}

  handleInput(data: string): void {
    if (data === "q" || data === "\u001b" || this.keybindings.matches(data, "app.interrupt")) {
      this.done();
      return;
    }
    if (data === "\t") {
      this.mode = this.mode === "timeline" ? "agents" : "timeline";
      this.selected = 0;
      this.selectedId = undefined;
      this.detailScroll = 0;
      this.invalidate();
      this.requestRender();
      return;
    }
    if (data === "1" || data === "2") {
      this.mode = data === "1" ? "timeline" : "agents";
      this.selected = 0;
      this.selectedId = undefined;
      this.detailScroll = 0;
      this.invalidate();
      this.requestRender();
      return;
    }
    if (data === "r") {
      this.invalidate();
      this.requestRender();
      return;
    }
    const detailDirection = data === "]" || data === "\u001b[6~" ? 1 : data === "[" || data === "\u001b[5~" ? -1 : 0;
    if (detailDirection) {
      this.detailScroll = Math.max(0, this.detailScroll + detailDirection * detailLineCount());
      this.invalidate();
      this.requestRender();
      return;
    }
    const direction = data === "j" || data === "\u001b[B" ? 1 : data === "k" || data === "\u001b[A" ? -1 : 0;
    if (!direction) return;
    const rows = buildWorkflowTuiRows(this.getSnapshot(), this.mode);
    this.selected = Math.max(0, Math.min(rows.length - 1, this.selected + direction));
    this.selectedId = rows[this.selected]?.id;
    this.detailScroll = 0;
    this.invalidate();
    this.requestRender();
  }

  invalidate(): void {
    this.cacheKey = "";
  }

  render(width: number): readonly string[] {
    const snapshot = this.getSnapshot();
    const rows = buildWorkflowTuiRows(snapshot, this.mode);
    if (this.selectedId) {
      const byId = rows.findIndex((row) => row.id === this.selectedId);
      if (byId >= 0) this.selected = byId;
    }
    this.selected = Math.max(0, Math.min(rows.length - 1, this.selected));
    this.selectedId = rows[this.selected]?.id;
    const selected = rows[this.selected];
    const detailLines = detailLineCount();
    const key = `${width}|${this.mode}|${this.selected}|${this.detailScroll}|${detailLines}|${rows.map((row) => `${row.id}:${row.title}:${row.subtitle}`).join("|")}`;
    if (key === this.cacheKey) return this.cache;

    const output: string[] = [];
    const modeLabel = this.mode === "timeline" ? "TIMELINE" : "AGENTS";
    const contentWidth = Math.max(1, width - 4);
    output.push(panelRule(width, this.paint, "╭", "╮"));
    output.push(panelRow(this.paint("accent", `Workflow · ${modeLabel}`), width, this.paint));
    output.push(panelRow("1 timeline · 2 agents · Tab alterna · j/k navega · [/]: detalhe · r atualiza · q fecha", width, this.paint));
    output.push(panelRule(width, this.paint, "├", "┤"));

    rows.slice(Math.max(0, this.selected - LIST_LINES + 1), Math.max(LIST_LINES, this.selected + 1)).forEach((row, offset) => {
      const index = Math.max(0, this.selected - LIST_LINES + 1) + offset;
      const marker = index === this.selected ? "›" : " ";
      output.push(panelRow(`${marker} ${row.title}`, width, this.paint));
      output.push(panelRow(`  ${this.paint("muted", row.subtitle)}`, width, this.paint));
    });

    while (output.length < 4 + LIST_LINES * 2) output.push(panelRow("", width, this.paint));
    output.push(panelRule(width, this.paint, "├", "┤"));
    const allDetailLines = wrappedDetail(selected?.detail ?? "", contentWidth);
    const maxDetailScroll = Math.max(0, allDetailLines.length - detailLines);
    this.detailScroll = Math.min(this.detailScroll, maxDetailScroll);
    const visibleDetail = allDetailLines.slice(this.detailScroll, this.detailScroll + detailLines);
    const detailRange = `${Math.min(this.detailScroll + 1, allDetailLines.length)}-${Math.min(this.detailScroll + visibleDetail.length, allDetailLines.length)}/${allDetailLines.length}`;
    output.push(panelRow(this.paint("accent", `${selected?.title ?? "Detalhe"} · ${detailRange}`), width, this.paint));
    visibleDetail.forEach((detail) => output.push(panelRow(detail, width, this.paint)));
    while (output.length < 4 + LIST_LINES * 2 + 1 + 1 + detailLines) output.push(panelRow("", width, this.paint));
    output.push(panelRow(this.paint("muted", `tools ${snapshot.ledger.toolCalls} · launches ${snapshot.ledger.launches} · events ${snapshot.ledger.protocolEvents}`), width, this.paint));
    output.push(panelRule(width, this.paint, "╰", "╯"));
    this.cacheKey = key;
    this.cache = output;
    return output;
  }
}
