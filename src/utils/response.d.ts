import { Response } from "express";
export declare const sendSuccess: (response: Response, message: string, data?: any, statusCode?: number) => Response<any, Record<string, any>>;
export declare const sendError: (res: Response, message: string, statusCode?: number, error?: any) => Response<any, Record<string, any>>;
//# sourceMappingURL=response.d.ts.map