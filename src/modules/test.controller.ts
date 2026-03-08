import { Request, Response } from 'express';
import testSchema from "../models/test.models";
export const test = async (req: Request, res: Response) => {
    const name = req.body;
    const newName = await testSchema.create(
         name 
    );
    const data = await testSchema.find();


    return res.status(200).json({
        message: "Test successful",
        name: newName,
        data
    })
}

