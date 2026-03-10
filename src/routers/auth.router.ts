import { Router } from 'express';
import { register, login, logout, refreshToken, loginWithGoogle } from '../modules/auth.controller';
import { authLimiter } from '../middlewares/rate-limit.middleware';
import isAuthenticated from '../middlewares/isAuthenticated';

const router = Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/loginGoogle", authLimiter, loginWithGoogle);
router.post("/logout", logout);
router.post("/refresh-token", refreshToken);

export default router;
