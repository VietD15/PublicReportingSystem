import { Router } from "express";
import { test } from "../modules/test.controller";


const router = Router();

router.post("/test", test);

export default router;