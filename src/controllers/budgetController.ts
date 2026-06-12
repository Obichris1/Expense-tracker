import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class BudgetController {
  // Create or Update Budget
  async upsertBudget(req: Request, res: Response) {
    try {
      const userId = req.user!.userId; // Assuming user is attached to request via auth middleware
      const { name, amount } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid budget amount is required',
        });
      }

      // Check if budget already exists
      const existingBudget = await prisma.budget.findUnique({
        where: { userId },
      });

      let budget;

      if (existingBudget) {
        // Update existing budget
        budget = await prisma.budget.update({
          where: { userId },
          data: {
            name: name || existingBudget.name,
            amount: amount,
          },
        });

        return res.status(200).json({
          success: true,
          message: 'Budget updated successfully',
          data: budget,
        });
      } else {
        // Create new budget
        budget = await prisma.budget.create({
          data: {
            userId,
            name: name || 'My Budget',
            amount,
            spent: 0,
          },
        });

        return res.status(201).json({
          success: true,
          message: 'Budget created successfully',
          data: budget,
        });
      }
    } catch (error) {
      console.error('Error upserting budget:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  // Get User Budget
  async getBudget(req: Request, res: Response) {
    try {
      const userId =  req.user!.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const budget = await prisma.budget.findUnique({
        where: { userId },
      });

      if (!budget) {
        return res.status(404).json({
          success: false,
          message: 'Budget not found',
        });
      }

      // Calculate percentage spent
      const percentageSpent = (Number(budget.spent) / Number(budget.amount)) * 100;

      return res.status(200).json({
        success: true,
        data: {
          ...budget,
          percentageSpent: Math.round(percentageSpent * 100) / 100,
          remaining: Number(budget.amount) - Number(budget.spent),
        },
      });
    } catch (error) {
      console.error('Error fetching budget:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  // Delete Budget
  async deleteBudget(req: Request, res: Response) {
    try {
      const userId =  req.user!.userId;;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      await prisma.budget.delete({
        where: { userId },
      });

      return res.status(200).json({
        success: true,
        message: 'Budget deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting budget:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  // Update Budget Spent (called when transactions are created)
  async updateBudgetSpent(userId: number, amount: number, type: 'add' | 'subtract') {
    try {
      const budget = await prisma.budget.findUnique({
        where: { userId },
      });

      if (!budget) {
        return null;
      }

      const currentSpent = Number(budget.spent);
      const newSpent = type === 'add' 
        ? currentSpent + amount 
        : Math.max(0, currentSpent - amount);

      const updatedBudget = await prisma.budget.update({
        where: { userId },
        data: {
          spent: newSpent,
        },
      });

      // Check if budget exceeded and send alert if needed
      if (newSpent > Number(budget.amount)) {
        const now = new Date();
        const lastAlert = budget.lastAlertSent;
        
        // Send alert only once per day
        if (!lastAlert || (now.getTime() - lastAlert.getTime()) > 24 * 60 * 60 * 1000) {
          await prisma.budget.update({
            where: { userId },
            data: {
              lastAlertSent: now,
            },
          });
          
          // TODO: Implement email/notification service here
          console.log(`Budget alert: User ${userId} has exceeded their budget`);
        }
      }

      return updatedBudget;
    } catch (error) {
      console.error('Error updating budget spent:', error);
      return null;
    }
  }
}

export const budgetController = new BudgetController();