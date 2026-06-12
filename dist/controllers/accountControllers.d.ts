import { Request, Response } from "express";
declare const getAccounts: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const createAccount: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const addMoneyToAccount: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export { getAccounts, createAccount, addMoneyToAccount };
//# sourceMappingURL=accountControllers.d.ts.map