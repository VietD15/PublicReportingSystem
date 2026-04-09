import { OAuth2Client } from "google-auth-library";
import authModel, { IAuth } from "../../models/auth.model";
import bcrypt from "bcrypt"
import roleSchema from '../../models/auth/roles';
import { ROLES } from "../../constant/role";
import crypto from "crypto";
import { userRepo } from "..";
import { generateTokens } from "../../utils/jwt";
import resetPasswordModel from "../../models/auth/resetPassword";
import { isMailConfigured, sendResetPasswordEmail } from "../../utils/mailer";

const googleClientId = process.env.GOOGLE_CLIENT_ID;

const client = new OAuth2Client(googleClientId);

export const CreateNewUser = async (userName: string, email: string, password: string): Promise<ServiceResponse<IAuth>> => {
    userName = userName?.trim();
    email = email?.trim().toLowerCase();
    password = password?.trim();

    if (!userName || !email || !password) {
        return {
            success: false,
            message: "All fields are required"
        }
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return {
            success: false,
            message: "Invalid email format"
        }
    }
    if (password.length < 6) {
        return {
            success: false,
            message: "Password must be at least 6 characters"
        }
    }
    const user = await authModel.findOne({
        $or: [
            { email },
            { userName }
        ]
    });
    if (user) {
        return {
            success: false,
            message: "This email or username is already registered"
        }
    }
    const hashedPassword = await bcrypt.hash(password, 12)
    const newUser = await authModel.create({
        userName,
        email,
        password: hashedPassword,
    })
    return {
        success: true,
        data: newUser
    }

}
export const loginService = async (userName: string, password: string): Promise<ServiceResponse<IAuth>> => {

    userName = userName?.trim().toLowerCase();
    password = password?.trim();

    if (!userName || !password) {
        return {
            success: false,
            message: 'Username and password are required'
        };
    }

    const user = await authModel.findOne({
        userName: userName
    });

    if (!user) {
        return {
            success: false,
            message: 'Incorrect username or password'
        };
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
        return {
            success: false,
            message: 'Incorrect username or password'
        };
    }

    return {
        success: true,
        data: user
    };
}
export const loginWithGoogleService = async (idToken: string): Promise<ServiceResponse<any>> => {

    if (!googleClientId) {
        return {
            success: false,
            message: "Google OAuth not configured"
        };
    }

    let ticket;
    try {
        ticket = await client.verifyIdToken({
            idToken,
            audience: googleClientId,
        });
    } catch (err) {
        return {
            success: false,
            message: "Invalid Google token"
        };
    }

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
        return {
            success: false,
            message: "Invalid Google token payload"
        };
    }

    const email = payload.email.toLowerCase();
    const userName = payload.name || email.split("@")[0];

    let user = await authModel.findOne({ email });

    if (!user) {
        const randomPassword = crypto.randomBytes(32).toString("hex");
        const hashedPassword = await bcrypt.hash(randomPassword, 12);

        user = await authModel.create({
            userName,
            email,
            password: hashedPassword,
            types: "login-google"
        });

        const userRole = await roleSchema.findOne({ name: ROLES.USERROLE });

        if (!userRole) {
            return {
                success: false,
                message: "Initial user role not found"
            };
        }

        await userRepo.AddNewRolesToNewUser(user._id.toString(), userRole._id.toString());
    }

    const roleIds = await userRepo.GetRoleIDsByUserID(user._id.toString());

    if (!roleIds.length) {
        return {
            success: false,
            message: "User role not found"
        };
    }

    const { accessToken, refreshToken } = generateTokens(user._id.toString(), roleIds);

    user.refreshToken = refreshToken;
    await user.save();

    return {
        success: true,
        data: {
            user,
            accessToken,
            refreshToken
        }
    };
};
export const forgotPasswordService = async (email: string): Promise<ServiceResponse<{ resetToken?: string; resetUrl?: string }>> => {
    email = email?.trim().toLowerCase();

    if (!email) {
        return {
            success: false,
            message: "Email is required"
        };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return {
            success: false,
            message: "Invalid email format"
        };
    }

    const genericMessage = "If the email is valid, password reset instructions have been sent";

    const user = await authModel.findOne({ email });

    if (!user) {
        return {
            success: true,
            message: genericMessage
        };
    }

    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedResetToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await resetPasswordModel.findOneAndUpdate(
        { email },
        {
            email,
            token: hashedResetToken,
            verified: false,
            expiresAt
        },
        {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        }
    );

    const baseResetUrl = process.env.RESET_PASSWORD_URL || process.env.FRONTEND_URL;
    const resetUrl = baseResetUrl
        ? `${baseResetUrl}?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(email)}`
        : undefined;

    const isProduction = process.env.NODE_ENV === "production";
    const canSendEmail = isMailConfigured();

    if (canSendEmail) {
        try {
            await sendResetPasswordEmail({
                to: email,
                resetCode: resetToken,
                resetUrl
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error("Forgot password email send failed:", errorMessage);

            return {
                success: false,
                message: errorMessage
            };
        }
    } else if (isProduction) {
        return {
            success: false,
            message: "Email service is not configured"
        };
    }

    return {
        success: true,
        message: canSendEmail
            ? genericMessage
            : "Password reset token created, but SMTP is not configured so no email was sent",
        data: isProduction || canSendEmail
            ? undefined
            : {
                resetToken,
                resetUrl
            }
    };

}

export const checkOTPService = async (email: string, otp: string): Promise<ServiceResponse<null>> => {
    email = email?.trim().toLowerCase();
    otp = otp?.trim();

    if (!email || !otp) {
        return {
            success: false,
            message: "Email and OTP are required"
        };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return {
            success: false,
            message: "Invalid email format"
        };
    }

    const hashedOtp = crypto
        .createHash("sha256")
        .update(otp)
        .digest("hex");

    const resetRecord = await resetPasswordModel.findOne({
        email,
        token: hashedOtp,
        expiresAt: { $gt: new Date() }
    });

    if (!resetRecord) {
        return {
            success: false,
            message: "Invalid or expired OTP"
        };
    }

    await resetPasswordModel.updateOne(
        { _id: resetRecord._id },
        {
            $set: {
                verified: true
            }
        }
    );

    return {
        success: true,
        message: "OTP verified successfully"
    };
};

export const resetPasswordService = async (email: string, newPassword: string): Promise<ServiceResponse<null>> => {
    email = email?.trim().toLowerCase();
    newPassword = newPassword?.trim();

    if (!email || !newPassword) {
        return {
            success: false,
            message: "Email and new password are required"
        };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return {
            success: false,
            message: "Invalid email format"
        };
    }

    if (newPassword.length < 6) {
        return {
            success: false,
            message: "Password must be at least 6 characters"
        };
    }

    const resetRecord = await resetPasswordModel.findOne({
        email,
        verified: true,
        expiresAt: { $gt: new Date() }
    });

    if (!resetRecord) {
        return {
            success: false,
            message: "OTP is invalid, expired, or not verified"
        };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const updateResult = await authModel.updateOne(
        { email },
        {
            $set: {
                password: hashedPassword,
                refreshToken: null
            }
        }
    );

    if (updateResult.modifiedCount === 0) {
        return {
            success: false,
            message: "Unable to reset password"
        };
    }

    await resetPasswordModel.deleteOne({ _id: resetRecord._id });

    return {
        success: true,
        message: "Password has been reset successfully"
    };
};