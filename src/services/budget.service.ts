import { prisma } from "../config/db";
import { AppError } from "../utils/appError";

interface UpsertBudgetInput {
  userId: number;
  name?: string;
  amount: number;
}

const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000; // one alert per day

export const budgetService = {
  async upsertBudget({ userId, name, amount }: UpsertBudgetInput) {
    if (!amount || amount <= 0) {
      throw new AppError("Valid budget amount is required", 400);
    }

    const existingBudget = await prisma.budget.findUnique({
      where: { userId },
    });

    if (existingBudget) {
      const budget = await prisma.budget.update({
        where: { userId },
        data: {
          name: name || existingBudget.name,
          amount,
        },
      });
      return { budget, created: false };
    }

    const budget = await prisma.budget.create({
      data: {
        userId,
        name: name || "My Budget",
        amount,
        spent: 0,
      },
    });
    return { budget, created: true };
  },

  async getBudget(userId: number) {
    const budget = await prisma.budget.findUnique({
      where: { userId },
    });

    if (!budget) {
      throw new AppError("Budget not found", 404);
    }

    const amount = Number(budget.amount);
    const spent = Number(budget.spent);
    const percentageSpent = amount > 0 ? (spent / amount) * 100 : 0;

    return {
      ...budget,
      percentageSpent: Math.round(percentageSpent * 100) / 100,
      remaining: amount - spent,
    };
  },

  async deleteBudget(userId: number) {
    // delete throws if the record doesn't exist; surface that as a 404
    const existing = await prisma.budget.findUnique({ where: { userId } });
    if (!existing) {
      throw new AppError("Budget not found", 404);
    }

    await prisma.budget.delete({ where: { userId } });
  },

  /**
   * Called from the transactions flow when a transaction is
   * created/deleted. Not exposed as an HTTP endpoint.
   */
  async updateBudgetSpent(
    userId: number,
    amount: number,
    type: "add" | "subtract"
  ) {
    try {
      const budget = await prisma.budget.findUnique({
        where: { userId },
      });

      if (!budget) {
        return null;
      }

      const currentSpent = Number(budget.spent);
      const newSpent =
        type === "add"
          ? currentSpent + amount
          : Math.max(0, currentSpent - amount);

      const updatedBudget = await prisma.budget.update({
        where: { userId },
        data: { spent: newSpent },
      });

      // Budget exceeded → alert at most once per day
      if (newSpent > Number(budget.amount)) {
        const now = new Date();
        const lastAlert = budget.lastAlertSent;

        if (
          !lastAlert ||
          now.getTime() - lastAlert.getTime() > ALERT_COOLDOWN_MS
        ) {
          await prisma.budget.update({
            where: { userId },
            data: { lastAlertSent: now },
          });

          // TODO: hook up email/notification service (Inngest is a good fit)
          console.log(`Budget alert: User ${userId} has exceeded their budget`);
        }
      }

      return updatedBudget;
    } catch (error) {
      console.error("Error updating budget spent:", error);
      return null;
    }
  },
};