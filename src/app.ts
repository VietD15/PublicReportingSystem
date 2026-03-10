import express from "express";
import userRouter from "./routers/user.router";
import authRouter from "./routers/auth.router";
import cors from "cors";
import cookieParser from "cookie-parser";
import errorHandler from "./middlewares/error-handing";
import { generalLimiter } from "./middlewares/rate-limit.middleware";

const app = express();

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(generalLimiter);

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("API running...");
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  errorHandler(err, req, res, next);
});

export default app;