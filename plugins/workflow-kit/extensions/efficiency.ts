import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

const STATUS_KEY = "workflow-efficiency";
const POLICY_MARKER = "<!-- workflow-efficiency:v1 -->";
const POLICY = `${POLICY_MARKER}
Prioridade desta sessão: minimize o tempo até uma entrega correta e verificada e o consumo total de tokens, incluindo ferramentas, subagents e retrabalho.
Reutilize contexto válido; prefira leituras direcionadas, respostas compactas e o menor número útil de agentes. Paralelize apenas trabalho independente autorizado.
Não repita exploração ou verificações ainda válidas. Entre agentes, reporte resultado, evidência, bloqueio e próximo passo, sem recapitulações.
Nunca omita requisitos, segurança, riscos, evidências ou validação obrigatória para economizar. Respeite as instruções superiores e o escopo do usuário.
Antes de delegar, carregue fast-subagent-protocol.`;

type ContextMessage = {
  role?: string;
  content?: unknown;
};

type ContextEvent = {
  messages: readonly ContextMessage[];
};

type EfficiencyContext = {
  ui: {
    setStatus: (key: string, value: string) => void;
    theme?: { fg: (tone: string, text: string) => string };
  };
};

type EfficiencyState = "pending" | "active";

function setEfficiencyStatus(ctx: EfficiencyContext, state: EfficiencyState): void {
  const label = state === "active" ? "ON" : "...";
  const plain = `${state === "active" ? "●" : "○"} ⚡ eficiência: ${label}`;

  try {
    const theme = ctx.ui.theme;
    if (theme?.fg) {
      const indicator = theme.fg(state === "active" ? "accent" : "dim", state === "active" ? "●" : "○");
      const title = theme.fg("muted", "eficiência: ");
      const value = theme.fg("text", label);
      ctx.ui.setStatus(STATUS_KEY, `${indicator} ⚡ ${title}${value}`);
      return;
    }
  } catch {
    // UI themes can be unavailable during startup.
  }

  ctx.ui.setStatus(STATUS_KEY, plain);
}

function hasPolicyInContext(messages: readonly ContextMessage[]): boolean {
  return messages.some((message) => {
    if (typeof message.content === "string") {
      return message.content.includes(POLICY_MARKER);
    }

    return Array.isArray(message.content) &&
      message.content.some((block) =>
        typeof block === "object" &&
        block !== null &&
        "text" in block &&
        typeof block.text === "string" &&
        block.text.includes(POLICY_MARKER)
      );
  });
}

export function registerEfficiency(pi: ExtensionAPI): void {
  const markPending = (ctx: EfficiencyContext) => {
    setEfficiencyStatus(ctx, "pending");
  };

  pi.on("session_start", async (_event, ctx) => {
    markPending(ctx);
  });

  pi.on("session.compacting", async (_event, ctx) => {
    markPending(ctx);
  });

  pi.on("session_before_switch", async (_event, ctx) => {
    markPending(ctx);
  });

  pi.on("session_before_branch", async (_event, ctx) => {
    markPending(ctx);
  });

  pi.on("context", async (event: ContextEvent, ctx) => {
    if (hasPolicyInContext(event.messages)) {
      setEfficiencyStatus(ctx, "active");
      return;
    }

    setEfficiencyStatus(ctx, "active");
    return {
      messages: [
        ...event.messages,
        {
          role: "user",
          content: [{ type: "text", text: POLICY }],
          timestamp: Date.now(),
        },
      ],
    };
  });
}

