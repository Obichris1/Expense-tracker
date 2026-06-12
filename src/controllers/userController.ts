import { Request,Response } from "express"
import { prisma } from "../config/db"
import { sendError, sendSuccess } from "../utils/response"
import bcrypt from "bcryptjs";



export async function getUser(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return sendError(res, "User not found", 404);
    }

    const { password, ...safeUser } = user;

    return sendSuccess(res, "User Found", safeUser, 200);
  } catch (error) {
    return sendError(
      res,
      error instanceof Error ? error.message : "Something went wrong"
    );
  }
}


export async   function changePassword (req : Request, res : Response){
  try {
    const userId = req.user!.userId;
  
    const { oldPassword, newPassword, confirmPassword } = req.body;
  
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
  
    if (!user) {
      return sendError(res, "User not found", 404);
    }
  
    // 1. check old password against DB
    const isMatchOldPassword = await bcrypt.compare(oldPassword, user.password);
  
    if (!isMatchOldPassword) {
      return sendError(res, "Old password is incorrect", 400);
    }
  
    // 2. prevent same password reuse
    if (oldPassword === newPassword) {
      return sendError(res, "New password must be different", 400);
    }
  
    // 3. confirm password check
    if (newPassword !== confirmPassword) {
      return sendError(res, "Passwords do not match", 400);
    }
  
    // 4. hash new password
    const newHashedPassword = await bcrypt.hash(newPassword, 10);
  
    // 5. update user
    await prisma.user.update({
      where: { id: userId },
      data: { password: newHashedPassword }
    });
  
    return sendSuccess(res, "Password updated successfully", null, 200);
  
  } catch (error) {
    return sendError(res, "Something went wrong", 500);
  }
}

export async function updateUser (req : Request, res : Response){

try {
  const userId = req.user!.userId;
      const {firstName, lastName, contact, country, currency} = req.body

      const user = await prisma.user.findUnique({where : {id: userId}})

      if(!user){
        
         return sendError(res, "User not found", 400)
      }


      const updatedUser = await prisma.user.update({
        where : {id : userId}, data : {firstName,lastName,contact,country,currency}
      })

      return sendSuccess(res, "User updated successfully", updateUser, 200 )

   
            
} catch (error) {
  
}
  
}