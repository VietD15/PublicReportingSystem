import { Request, Response, NextFunction } from "express";
import { PageArray } from "../../helper/pageAray";
import { UserMapper } from "../../mapper/auth/user.mapper";
import { ERROR_CODES } from "../../constant/error";
import { AppError } from "../../utils/app-error";
import {userRepo} from "../../repos/index";

// assignRoleToUser
export const AssignRoleToUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId, roleIds } = req.body;
        await userRepo.assignRoleToUser(userId, roleIds);

        return res.status(200).json({
            success: true,
            message: "Roles assigned to user successfully"
        });
    } catch (error) {
        console.error("AssignRoleToUser error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

export const GetUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit, search } = req.body;
        const result = await userRepo.getUsers(search as string);
        if (!result) {
            const err = ERROR_CODES.SERVER_ERROR;
            return next(new AppError(err.statusCode, err.code, "Failed to get users"));
        }

        const pageNum = Math.max(1, parseInt(page as string) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit as string) || 10));
        const usersInfo = PageArray.toArrayPage(result.users, pageNum, limitNum);

        const responseData = usersInfo.items.map((user) => {
            return UserMapper.toUsersResponse(user);
        });

        return res.status(200).json({
            success: true,
            users: responseData,
            total: result.total,
            page: usersInfo.page,
            totalPages: usersInfo.totalPages,
        });
    } catch (error) {
        console.error("GetUsers error:", error);
        if (error instanceof AppError) {
            return next(error);
        }
        const err = ERROR_CODES.SERVER_ERROR;
        return next(new AppError(err.statusCode, err.code, "Internal Server Error"));
    }
}

export const GetUserById = async (req: Request, res: Response, next: NextFunction) => {
        try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!id) {
            const err = ERROR_CODES.NOT_FOUND;
            return next(new AppError(err.statusCode, err.code, "User not found"));
        }

        console.log("GetUserById userID:", id);
        

        const result = await userRepo.getUser(id);
        if (!result) {
            const err = ERROR_CODES.NOT_FOUND;
            return next(new AppError(err.statusCode, err.code, "User not found"));
        }
        
        const responseData = UserMapper.toUserResponse(result.user, result.roles);

        return res.status(200).json({
            success: true,
            user: responseData,
        });
    } catch (error) {
        console.error("GetUserById error:", error); 
        if (error instanceof AppError) {
            return next(error);
        }
        const err = ERROR_CODES.SERVER_ERROR;
        return next(new AppError(err.statusCode, err.code, "Internal Server Error"));
        }
}