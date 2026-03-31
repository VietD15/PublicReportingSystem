import { Request, Response } from 'express';
import authModel from '../models/auth.model';
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from 'google-auth-library';
import roleSchema from '../models/auth/roles';
import { ROLES } from '../constant/role';
import {userRepo} from "../repos/index";



const secret = process.env.SECRET_KEY;
const refreshSecret = process.env.JWT_REFRESH_SECRET;
const googleClientId = process.env.GOOGLE_CLIENT_ID;

if (!secret) {
    throw new Error("Thiếu biến môi trường SECRET_KEY!");
}
if (!refreshSecret) {
    throw new Error("Thiếu biến môi trường JWT_REFRESH_SECRET!");
}
const client = new OAuth2Client(googleClientId);

export const register = async (req: Request, res: Response) => {
    try {
        let { userName, email, password } = req.body;

        // Trim inputs
        userName = userName?.trim();
        email = email?.trim().toLowerCase();
        password = password?.trim();

        if (!userName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            })
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            })
        }
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            })
        }

        const user = await authModel.findOne({
            $or: [
                { email },
                { userName }
            ]
        });
        if (user) {
            return res.status(409).json({
                success: false,
                message: "This email or username is already registered"
            })
        }
        const hashedPassword = await bcrypt.hash(password, 12)
        const newUser = await authModel.create({
            userName,
            email,
            password: hashedPassword,
        })

        const userRole = await roleSchema.findOne({ name: ROLES.USERROLE });
        if (!userRole) {
            return res.status(409).json({
                success: false,
                message: "Initial user role not found. Please contact support."
            })
        }
        await userRepo.AddNewRolesToNewUser(newUser._id.toString(), userRole._id.toString());
        return res.status(201).json({
            success: true,
            message: "Account created successfully"
        })

    } catch (error) {
        console.error("Register error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

export const login = async (req: Request, res: Response) => {
    try {
        let { identifier, password } = req.body;
        identifier = identifier?.trim().toLowerCase();
        password = password?.trim();

        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                message: 'Identifier and password are required'
            });
        }
        const user = await authModel.findOne({
            $or: [
                {
                    email: identifier
                },
                {
                    userName: identifier
                }
            ]
        });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Incorrect email or password'
            });
        }
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: "Incorrect email or password"
            })
        }
        const roleIds = await userRepo.GetRoleIDsByUserID(user._id.toString());
        if (!roleIds.length) {
            return res.status(403).json({
                success: false,
                message: "User role not found"
            });
        }

        console.log("User " + user.userName + " logged in with roles: " + roleIds.join(", "));

        const accessToken = jwt.sign({ _id: user._id, roleIds }, secret, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ _id: user._id }, refreshSecret, { expiresIn: '7d' });
        user.refreshToken = refreshToken;
        await user.save();
        const isProduction = process.env.NODE_ENV === 'production';


        return res.status(200)
            .cookie("accessToken", accessToken, {
                httpOnly: true,
                sameSite: "lax",
                secure: isProduction,
                maxAge: 24 * 60 * 60 * 1000
            })
            .cookie("refreshToken", refreshToken, {
                httpOnly: true,
                sameSite: "lax",
                secure: isProduction,
                maxAge: 7 * 24 * 60 * 60 * 1000
            })
            .json({
                success: true,
                message: `Welcome back ${user.userName}`,
                accessToken,
                refreshToken,
                user: {
                    _id: user._id,
                    userName: user.userName,
                    email: user.email
                }
            })
    }
    catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

export const loginWithGoogle = async (req: Request, res: Response) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({
                success: false,
                message: "Google ID token is required"
            });
        }

        if (!googleClientId) {
            return res.status(500).json({
                success: false,
                message: "Google OAuth not configured"
            });
        }

        // Verify the Google ID token
        let ticket;
        try {
            ticket = await client.verifyIdToken({
                idToken: idToken,
                audience: googleClientId,
            });
        } catch (verifyError) {
            console.error("Google token verification error:", verifyError);
            return res.status(403).json({
                success: false,
                message: "Invalid Google token"
            });
        }

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            return res.status(403).json({
                success: false,
                message: "Invalid Google token payload"
            });
        }

        const email = payload.email.toLowerCase();
        const userName = payload.name || email.split('@')[0];

        // Check if user exists in the database
        let user = await authModel.findOne({ email });

        if (!user) {
            // Create new user for Google login
            const randomPassword = crypto.randomBytes(32).toString('hex');
            const hashedPassword = await bcrypt.hash(randomPassword, 12);

            user = await authModel.create({
                userName: userName,
                email: email,
                password: hashedPassword,
                types: "google"
            });
            const userRole = await roleSchema.findOne({ name: ROLES.USERROLE });
            if (!userRole) {
                return res.status(409).json({
                    success: false,
                    message: "Initial user role not found. Please contact support."
                })
            }
            await userRepo.AddNewRolesToNewUser(user._id.toString(), userRole._id.toString());
        }

        const roleIds = await userRepo.GetRoleIDsByUserID(user._id.toString());
        if (!roleIds.length) {
            return res.status(403).json({
                success: false,
                message: "User role not found"
            });
        }
        // Generate tokens (same as regular login)
        const accessToken = jwt.sign({ _id: user._id, roleIds }, secret, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ _id: user._id }, refreshSecret, { expiresIn: '7d' });

        // Save refresh token to database
        user.refreshToken = refreshToken;
        await user.save();

        const isProduction = process.env.NODE_ENV === 'production';

        return res.status(200)
            .cookie("accessToken", accessToken, {
                httpOnly: true,
                sameSite: "lax",
                secure: isProduction,
                maxAge: 15 * 60 * 1000
            })
            .cookie("refreshToken", refreshToken, {
                httpOnly: true,
                sameSite: "lax",
                secure: isProduction,
                maxAge: 7 * 24 * 60 * 60 * 1000
            })
            .json({
                success: true,
                message: `Welcome back ${user.userName}`,
                accessToken,
                refreshToken,
                user: {
                    _id: user._id,
                    userName: user.userName,
                    email: user.email
                }
            });
    } catch (error) {
        console.error("Google login error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

export const refreshToken = async (req: Request, res: Response) => {
    try {
        const tokenToRefresh = req.cookies?.refreshToken || req.body.refreshToken;

        if (!tokenToRefresh) {
            return res.status(401).json({ success: false, message: "Refresh token is required" });
        }

        const decoded = jwt.verify(tokenToRefresh, refreshSecret) as { _id: string };

        const user = await authModel.findOne({
            _id: decoded._id,
            refreshToken: tokenToRefresh
        });

        if (!user) {
            return res.status(403).json({ success: false, message: "Invalid refresh token. Please login again." });
        }

        const newAccessToken = jwt.sign({ _id: user._id }, secret, { expiresIn: '15m' });
        const newRefreshToken = jwt.sign({ _id: user._id }, refreshSecret, { expiresIn: '7d' });

        user.refreshToken = newRefreshToken;
        await user.save();

        const isProduction = process.env.NODE_ENV === 'production';
        const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: isProduction };

        return res.status(200)
            .cookie("accessToken", newAccessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 })
            .cookie("refreshToken", newRefreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 })
            .json({
                success: true,
                message: "Token refreshed successfully",
                accessToken: newAccessToken,
                refreshToken: newRefreshToken
            });
    } catch (error) {
        console.error("Refresh token error:", error);
        return res.status(403).json({ success: false, message: "Invalid or expired refresh token" });
    }
}

export const logout = async (req: Request, res: Response) => {
    try {
        const tokenToRevoke = req.cookies?.refreshToken || req.body.refreshToken;

        if (tokenToRevoke) {
            await authModel.updateOne(
                { refreshToken: tokenToRevoke },
                { $set: { refreshToken: null } }
            );
        }

        const isProduction = process.env.NODE_ENV === 'production';
        const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: isProduction };

        return res.status(200)
            .clearCookie("accessToken", cookieOptions)
            .clearCookie("refreshToken", cookieOptions)
            .json({
                success: true,
                message: "Logged out successfully"
            });
    } catch (error) {
        console.error("Logout error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}
