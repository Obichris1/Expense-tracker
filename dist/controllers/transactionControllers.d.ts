import express from 'express';
import { Request, Response } from 'express';
interface LineItem {
    name: string;
    quantity: number;
    unit_price: number;
    amount: number;
    category: string;
}
interface ReceiptData {
    merchant: string;
    date: string;
    time: string | null;
    currency: string;
    payment_method: string | null;
    category: string;
    line_items: LineItem[];
    totals: {
        subtotal: number;
        tax: number;
        discount: number;
        total: number;
    };
    expense_categories: {
        category: string;
        amount: number;
    }[];
    notes: string | null;
}
declare const getTransactions: (req: Request, res: Response) => Promise<express.Response<any, Record<string, any>> | undefined>;
declare const addTransactions: (req: Request, res: Response) => Promise<express.Response<any, Record<string, any>>>;
declare const transferMoneyToAccount: (req: Request, res: Response) => Promise<express.Response<any, Record<string, any>>>;
declare const getDashboardInformation: (req: Request, res: Response) => Promise<express.Response<any, Record<string, any>>>;
declare const deleteTransaction: (req: Request, res: Response) => Promise<express.Response<any, Record<string, any>>>;
declare const updateTransaction: (req: Request, res: Response) => Promise<express.Response<any, Record<string, any>>>;
declare const ScanReceipt: (file: Express.Multer.File) => Promise<ReceiptData>;
export { getTransactions, addTransactions, transferMoneyToAccount, getDashboardInformation, deleteTransaction, updateTransaction, ScanReceipt };
//# sourceMappingURL=transactionControllers.d.ts.map