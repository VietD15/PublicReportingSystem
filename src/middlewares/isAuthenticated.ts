import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import authModel from "../models/auth.model";
import mongoose from "mongoose";
const SecretKey = process.env.SECRET_KEY;
if (!SecretKey) {
    throw new Error("need SECRET_KEY!");
}
export interface IUserAuth {
    _id: mongoose.Types.ObjectId | string;
    userName: string;
    email: string;
    types: string;
}
declare global {
    namespace Express {
        interface Request {
            user?: IUserAuth;
        }
    }
}
const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies?.accessToken;

        // 1. Kiểm tra token có tồn tại không
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Bạn chưa đăng nhập",
            });
        }

        // 2. Giải mã token
        let decoded;
        try {
            decoded = jwt.verify(token, SecretKey);
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: "Token không hợp lệ hoặc đã hết hạn",
            });
        }
        // 3. Kiểm tra user có tồn tại không
        const user = await authModel.findById((decoded as any)._id).select("-password");
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Tài khoản không tồn tại hoặc đã bị khóa",
            });
        }
        // 4. Gắn thông tin user vào req để các middleware sau có thể sử dụng
        req.user = user;
        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Lỗi xác thực máy chủ",
        });
    }
};

export default isAuthenticated;
