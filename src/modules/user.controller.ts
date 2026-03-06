import { Request, Response } from "express";
import {uploadToR2} from "../helper/r2-upload";
import { AppError } from "../utils/app-error";
import { ERROR_CODES } from "../constant/error";

export const uploadFIle = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            const err = ERROR_CODES.UPLOAD_ERROR;
            throw new AppError(err.statusCode, err.code, err.message);
        }
        const fileUrl = await uploadToR2(req.file);
        res.status(200).json({ 
            message: "File uploaded successfully",
            url: fileUrl 
        });
    } catch (error) {
    console.error("Controller R2 ERROR:", error);
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ message: error.message });
        } else {
            const err = ERROR_CODES.SERVER_ERROR;
            res.status(err.statusCode).json({ message: err.message });
        }
    }
};