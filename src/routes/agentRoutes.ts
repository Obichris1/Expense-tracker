// -----------------------------------------------------------------
// src/routes/agent.routes.ts
// -----------------------------------------------------------------
import { Router } from "express";
import { chat,listConversations,getConversationMessagesController} from "../controllers/agentController";
import { authMiddleware } from "../middlewares/authMiddleware";
//
const router = Router();
router.post("/chat", authMiddleware, chat);
router.get("/conversations", authMiddleware, listConversations);
router.get(
    "/conversations/:id/messages",
    authMiddleware,
    getConversationMessagesController,
  );
export default router;

// then in src/routes/index.ts:
// router.use("/agent", agentRoutes);

// Frontend hits: POST /api-v1/agent/chat  (through your Next proxy: /api/agent/chat)
// Body: { message: string, history: Content[] }