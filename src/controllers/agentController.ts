// src/controllers/agent.controller.ts
import { Request, Response,NextFunction } from "express";
import { agentService } from "../services/agent.service";
import { memoryService } from "../services/memory.service";
import { sendSuccess, sendError } from "../utils/response";
import { AppError } from "../utils/appError";

export async function chat(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return sendError(res, "Unauthorized", 401);
    }

    const { message, conversationId: rawId } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return sendError(res, "Message is required", 400);
    }

    let conversationId: number | undefined;
    if (rawId !== undefined && rawId !== null && rawId !== "") {
      const parsed = Number(rawId);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return sendError(res, "conversationId must be a positive integer", 400);
      }
      conversationId = parsed;
    }

    const reply = await agentService.chat(userId, message, conversationId);

    return sendSuccess(res, "Agent reply", reply, 200);
  } catch (error) {
    if (error instanceof AppError) {
      return sendError(res, error.message, error.statusCode);
    }
    console.error("Agent error:", error);
    return sendError(res, "Something went wrong", 500);
  }
}


// agent.controller.ts
export async function listConversations(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) return sendError(res, "Unauthorized", 401);

    const conversations = await memoryService.listConversations(userId);
    return sendSuccess(res, "Conversations", conversations, 200);
  } catch (error) {
    if (error instanceof AppError) return sendError(res, error.message, error.statusCode);
    console.error("Agent error:", error);
    return sendError(res, "Something went wrong", 500);
  }
}
// src/controllers/agent.controller.ts
export const getConversationMessagesController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const conversationId = Number(req.params.id);
    if (!Number.isFinite(conversationId)) {
      throw new AppError("Invalid conversation id", 400);
    }
    const data = await memoryService.getConversationMessages(userId, conversationId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
// agent.routes.ts
