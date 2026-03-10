import { Router } from "express";
import { getMe, uploadFIle } from "../modules/user.controller";
import multer from "multer";
import isAuthenticated from "../middlewares/isAuthenticated";

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
})

router.post("/upload",upload.single("file") , uploadFIle);
router.get("/me", isAuthenticated,getMe);

export default router;