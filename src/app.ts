import express from "express";
import userRouter from "./routers/user.router";
import cors from "cors";
import errorHandler from "./middlewares/error-handing";
import testRouter from "./routers/test.router";
const app = express();

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("API running...");
});

app.use("/api/v1/users", userRouter);
app.use("/api/v1", testRouter);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  errorHandler(err, req, res, next);
});

export default app;