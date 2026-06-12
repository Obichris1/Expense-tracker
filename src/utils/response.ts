import { Response } from "express"


export const sendSuccess = (response : Response, message : string, data? :any , statusCode = 200) =>{

    return response.status(statusCode).json({
        success : true,
        message,
        data
    })


}


export const sendError = (
    res: Response,
    message: string,
    statusCode = 500,
    error?: any
  ) => {
    return res.status(statusCode).json({
      success: false,
      message,
      error: error instanceof Error ? error.message : error,
    });
  };