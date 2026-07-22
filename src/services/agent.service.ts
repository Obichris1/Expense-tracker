// src/services/agent.service.ts
import { GoogleGenAI, Content, Part } from "@google/genai";
import { tools } from "../utils/tools";
import { AppError } from "../utils/appError";
import { getDashboardInformation, getTransactions, addTransaction } from "./transaction.service";
import { accountService } from "./account.service";
import { memoryService } from "./memory.service";
import { budgetService } from "./budget.service";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const MODEL = "gemini-2.5-flash";
const MAX_TOOL_ROUNDS = 5;

const BASE_SYSTEM_INSTRUCTION = `
You are a helpful financial assistant inside a personal expense tracker app called Pocket Wallet.
You can look up the user's dashboard, search transactions, create transactions, and manage accounts.

Rules:
- Amounts related to the user's finances (balances, transactions, budgets, debts, income, and savings) must come from tool calls. Never invent or estimate them.
- For general market prices of goods and services, you may use your general knowledge to provide approximate prices. Clearly state when a price is an estimate, as prices vary by location, retailer, taxes, and time.
- If an accurate, current price is required for financial advice, ask the user for the price or use a price lookup tool if one is available.
- If you need to create a transaction but don't know the accountId, call getAccounts first to find it.
- Before creating a transaction, confirm you have: accountId, amount, description, and type.
- When analysing spending, group by category — not by individual description.
- Keep answers short and concrete. Use ₦ for naira amounts.
- Users have exactly ONE budget. To change the amount or name, call upsertBudget — do NOT delete and recreate.
- When the user talks about budget targets or goals, prefer upsertBudget over rememberFact. Budgets are structured data with their own table.
- Only call deleteBudget when the user explicitly asks to remove or clear their budget entirely.
- When the user shares a durable fact about their finances (salary date, recurring bills,
  budgets, goals), call rememberFact to save it. Do NOT save one-off transactions as facts.
`.trim();

function buildSystemInstruction(facts: string[]): string {
  if (facts.length === 0) return BASE_SYSTEM_INSTRUCTION;
  return `${BASE_SYSTEM_INSTRUCTION}

Known facts about this user (from previous conversations):
${facts.map((f) => `- ${f}`).join("\n")}`;
}

// ─── Strip thoughtSignature blobs before storing history ─────────────────────
function stripThoughtSignatures(content: Content): Content {
  return {
    ...content,
    parts: content.parts?.map(({ thoughtSignature, ...rest }: any) => rest) ?? [],
  };
}

// ─── Tool executors ───────────────────────────────────────────────────────────
// userId ALWAYS comes from the authenticated request, never from the model.

type ToolExecutor = (userId: number, args: Record<string, any>) => Promise<unknown>;

const toolExecutors: Record<string, ToolExecutor> = {
  getDashboardSummary: async (userId) => {
    return getDashboardInformation(userId);
  },

  getTransactions: async (userId, args) => {
    return getTransactions({
      userId,
      search: args.search,
      df: args.fromDate,
      dt: args.toDate,
      page: args.page ?? 1,
      limit: args.limit ?? 10,
    });
  },

  addTransaction: async (userId, args) => {
    return addTransaction({
      userId,
      accountId: args.accountId,
      amount: args.amount,
      description: args.description,
      category: args.category,
      source: args.source,
      type: args.type,
    });
  },

  getAccounts: async (userId) => {
    return accountService.getAccounts(userId);
  },

  createAccount: async (userId, args) => {
    return accountService.createAccount({
      userId,
      name: args.name,
      number: args.number,
      amount: args.amount,
    });
  },

  rememberFact: async (userId, args) => {
    await memoryService.rememberFact(userId, args.content);
    return { saved: true };
  },

  getBudget: async (userId) => {
    return budgetService.getBudget(userId);
  },
  
  upsertBudget: async (userId, args) => {
    return budgetService.upsertBudget({
      userId,
      name: args.name,
      amount: args.amount,
    });
  },
  
  deleteBudget: async (userId) => {
    await budgetService.deleteBudget(userId);
    return { deleted: true };
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgentReply {
  text: string;
  actions: { name: string; args: Record<string, any> }[];
  conversationId: number;
}

// ─── Agent ────────────────────────────────────────────────────────────────────

export const agentService = {
  async chat(
    userId: number,
    message: string,
    conversationId?: number
  ): Promise<AgentReply> {
    if (!message?.trim()) {
      throw new AppError("Message is required", 400);
    }

    // Load memory: conversation history + long-term facts
    const conversation = await memoryService.getOrCreateConversation(userId, conversationId);
    const [history, facts] = await Promise.all([
      memoryService.loadHistory(conversation.id),
      memoryService.getFacts(userId),
    ]);

    const contents: Content[] = [
      ...history,
      { role: "user", parts: [{ text: message }] },
    ];
    const deltaStart = history.length; // everything from here on is new this request

    const systemInstruction = buildSystemInstruction(facts);
    const actions: AgentReply["actions"] = [];

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          systemInstruction,
          tools,
        },
      });

      const modelContent = response.candidates?.[0]?.content;
      if (!modelContent) {
        throw new AppError("No response from model", 502);
      }

      // Strip thoughtSignature before storing — keeps history lean
      contents.push(stripThoughtSignatures(modelContent));

      const functionCalls = response.functionCalls ?? [];

      // No tool calls → final text answer
      if (functionCalls.length === 0) {
        // Persist only this request's new turns
        await memoryService.appendMessages(conversation.id, contents.slice(deltaStart));
        await memoryService.setTitleIfEmpty(conversation.id, message);

        return {
          text: response.text ?? "",
          actions,
          conversationId: conversation.id,
        };
      }

      // Execute all requested tools and collect responses
      const responseParts: Part[] = [];

      for (const call of functionCalls) {
        const name = call.name ?? "";
        const args = (call.args ?? {}) as Record<string, any>;
        const executor = toolExecutors[name];

        let result: unknown;
        if (!executor) {
          result = { error: `Unknown tool: ${name}` };
        } else {
          try {
            result = await executor(userId, args);
            actions.push({ name, args });
          } catch (error) {
            result = {
              error: error instanceof Error ? error.message : "Tool execution failed",
            };
          }
        }

        responseParts.push({
          functionResponse: {
            name,
            response: { result },
          },
        });
      }

      contents.push({ role: "user", parts: responseParts });
    }

    throw new AppError("Agent exceeded maximum tool rounds", 500);
  },
};