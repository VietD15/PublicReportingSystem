import nodemailer from "nodemailer";

type SendResetPasswordMailInput = {
    to: string;
    resetCode: string;
    resetUrl?: string;
};

const getRequiredMailEnv = () => {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM;

    if (!host || !port || !user || !pass || !from) {
        return null;
    }

    return {
        host,
        port: Number(port),
        user,
        pass,
        from
    };
};

export const isMailConfigured = (): boolean => {
    const mailConfig = getRequiredMailEnv();
    return !!mailConfig && Number.isFinite(mailConfig.port);
};

export const sendResetPasswordEmail = async ({ to, resetCode, resetUrl }: SendResetPasswordMailInput): Promise<void> => {
    const mailConfig = getRequiredMailEnv();

    if (!mailConfig || !Number.isFinite(mailConfig.port)) {
        throw new Error("SMTP configuration is missing or invalid");
    }

    const transporter = nodemailer.createTransport({
        host: mailConfig.host,
        port: mailConfig.port,
        secure: mailConfig.port === 465,
        auth: {
            user: mailConfig.user,
            pass: mailConfig.pass
        }
    });

    const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
            <h2>Password Reset Request</h2>
            <p>You requested to reset your password. Use the 6-digit code below:</p>
            <p style="font-size: 26px; font-weight: 700; letter-spacing: 4px; margin: 14px 0; color: #0f766e;">
                ${resetCode}
            </p>
            <p>This code will expire in 15 minutes.</p>
            <p>
                <a href="${resetUrl || '#'}" style="display: inline-block; padding: 10px 16px; background-color: #0f766e; color: #ffffff; text-decoration: none; border-radius: 6px; ${resetUrl ? '' : 'pointer-events:none;opacity:0.6;'}">
                    Reset Password
                </a>
            </p>
            <p>This link will expire in 15 minutes. If you did not request this, you can ignore this email.</p>
        </div>
    `;

    try {
        await transporter.verify();

        await transporter.sendMail({
            from: mailConfig.from,
            to,
            subject: "Reset your password",
            text: resetUrl
                ? `Your 6-digit reset code is ${resetCode}. You can also reset by this link: ${resetUrl}`
                : `Your 6-digit reset code is ${resetCode}`,
            html
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (/EAUTH|Username and Password not accepted|Invalid login/i.test(errorMessage)) {
            throw new Error("SMTP authentication failed. If you use Gmail, enable 2FA and use an App Password.");
        }

        throw new Error(`Failed to send reset email: ${errorMessage}`);
    }
};
