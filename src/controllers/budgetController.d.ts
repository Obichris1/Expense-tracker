import { Request, Response } from 'express';
export declare class BudgetController {
    upsertBudget(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getBudget(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deleteBudget(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateBudgetSpent(userId: number, amount: number, type: 'add' | 'subtract'): Promise<{
        userId: number;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string | null;
        amount: import("@prisma/client/runtime/library").Decimal;
        spent: import("@prisma/client/runtime/library").Decimal;
        lastAlertSent: Date | null;
    } | null>;
}
export declare const budgetController: BudgetController;
//# sourceMappingURL=budgetController.d.ts.map