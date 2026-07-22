// src/services/memory.service.ts
import { Content } from "@google/genai";
import { prisma } from "../config/db";
import { AppError } from "../utils/appError";

// How many recent messages to rehydrate into the model's context.
// Tune this against your token budget — 30 turns of a finance chat is plenty.
const MAX_HISTORY_MESSAGES = 30;
const MAX_FACTS = 20;

function isPlainUserText(content: Content): boolean {
  const parts = (content.parts ?? []) as any[];
  return (
    content.role === "user" &&
    parts.some((p) => typeof p.text === "string") &&
    !parts.some((p) => p.functionResponse)
  );
}

export const memoryService = {
  // ─── Conversations (short-term memory) ─────────────────────────────────────

  async getOrCreateConversation(userId: number, conversationId?: number) {
    if (conversationId) {

        console.log("conversationnnnnn" ,conversationId)
      // Always scope by userId — never trust a raw conversationId from the client
      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId },
      });
      if (!conversation) throw new AppError("Conversation not found", 404);
      return conversation;
    }
    return prisma.conversation.create({ data: { userId } });
  },

  async loadHistory(conversationId: number): Promise<Content[]> {
    const messages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { id: "desc" },
      take: MAX_HISTORY_MESSAGES,
    });
    messages.reverse(); // back to chronological order

    const history: Content[] = messages.map((m) => ({
      role: m.role,
      parts: m.parts as any,
    }));

    // The window must never open on a dangling functionResponse turn —
    // Gemini rejects a functionResponse with no preceding functionCall.
    // Drop leading messages until the first plain user text message.
    while (history.length && !isPlainUserText(history[0])) {
      history.shift();
    }

    return history;
  },

  /** Persist only the new turns produced by this request (user msg + model turns + tool responses). */
  async appendMessages(conversationId: number, contents: Content[]) {
    if (!contents.length) return;

    await prisma.$transaction([
      prisma.chatMessage.createMany({
        data: contents.map((c) => ({
          conversationId,
          role: c.role === "model" ? ("model" as const) : ("user" as const),
          parts: (c.parts ?? []) as any,
        })),
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);
  },

  async setTitleIfEmpty(conversationId: number, firstMessage: string) {
    await prisma.conversation.updateMany({
      where: { id: conversationId, title: null },
      data: { title: firstMessage.trim().slice(0, 60) },
    });
  },

  async listConversations(userId: number) {
    return prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true },
    });
  },

  // src/services/memory.service.ts — add this method

async getConversationMessages(userId: number, conversationId: number) {
  // Ownership check — never trust a raw conversationId from the client
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
  });
  if (!conversation) throw new AppError("Conversation not found", 404);

  const messages = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { id: "asc" },
  });

  type UiMessage = {
    role: "user" | "assistant";
    text: string;
    actions?: { name: string; args: Record<string, any> }[];
  };

  const result: UiMessage[] = [];
  // Actions accumulate across model turns until the next assistant text lands,
  // so a run of tool calls followed by a final answer becomes one bubble with chips.
  let pendingActions: { name: string; args: Record<string, any> }[] = [];

  for (const msg of messages) {
    const parts = (msg.parts ?? []) as any[];

    if (msg.role === "user") {
      // Skip tool-response turns — those are internal, not real user input
      const isFunctionResponse = parts.some((p) => p.functionResponse);
      if (isFunctionResponse) continue;

      const text = parts
        .filter((p) => typeof p.text === "string")
        .map((p) => p.text)
        .join("");
      if (!text) continue;

      result.push({ role: "user", text });
    } else {
      // model turn — may contain text, function calls, or both
      const text = parts
        .filter((p) => typeof p.text === "string")
        .map((p) => p.text)
        .join("");

      const functionCalls = parts
        .filter((p) => p.functionCall)
        .map((p) => ({
          name: p.functionCall.name,
          args: (p.functionCall.args ?? {}) as Record<string, any>,
        }));

      pendingActions.push(...functionCalls);

      if (text) {
        result.push({
          role: "assistant",
          text,
          actions: pendingActions.length ? pendingActions : undefined,
        });
        pendingActions = [];
      }
    }
  }

  return result;
},

  async deleteConversation(userId: number, conversationId: number) {
    const { count } = await prisma.conversation.deleteMany({
      where: { id: conversationId, userId },
    });
    if (count === 0) throw new AppError("Conversation not found", 404);
  },

  // ─── Facts (long-term memory) ──────────────────────────────────────────────

  async getFacts(userId: number): Promise<string[]> {
    const facts = await prisma.memoryFact.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: MAX_FACTS,
    });
    return facts.map((f) => f.content);
  },

  async rememberFact(userId: number, content: string) {
    const trimmed = content?.trim();
    if (!trimmed) throw new AppError("Fact content is required", 400);

    return prisma.memoryFact.upsert({
      where: { userId_content: { userId, content: trimmed } },
      update: {},
      create: { userId, content: trimmed },
    });
  },
};