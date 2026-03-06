import { Router } from "express";
import { uploadFIle } from "../modules/user.controller";
import multer from "multer";

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
})

router.post("/upload",upload.single("file") , uploadFIle);

export default router;