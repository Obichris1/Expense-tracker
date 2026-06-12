import { Request, Response, NextFunction } from "express";
import { JwtPayload } from "jsonwebtoken";
interface AuthPayload extends JwtPayload {
    userId: number;
    role?: string;
}
declare global {
    namespace Express {
        interface Request {
            user?: AuthPayload;
        }
    }
}
export declare const authMiddleware: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export {};
//# sourceMappingURL=authMiddleware.d.ts.map