import { Request, Response } from "express";
export declare function register(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function login(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function logout(req: Request, res: Response): Promise<void>;
export declare const getUser: (req: Request, res: Response) => Response<any, Record<string, any>>;
export declare const refreshToken: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=authController.d.ts.map