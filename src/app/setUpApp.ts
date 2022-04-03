import express, { Application, Request, Response } from "express";
import userRouter from "#user/surfaces/express/routes";
import authRouter from "src/core/surfaces/express/auth/routes";
import parseToken from "src/core/surfaces/express/middleware/parseToken";
import cors from "cors";

const PREFIX = "/api/v1";

const setUpApp = (app: Application) => {
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use(cors({ origin: ["http://localhost:3000"] }));

    app.use(parseToken);

    //Routes
    app.get("/", (req: Request, res: Response) =>
        res
            .status(200)
            .json({ success: true, value: { message: "Server running" } })
    );
    app.use(`${PREFIX}/user`, userRouter);
    app.use(`${PREFIX}/auth`, authRouter);
};

export default setUpApp;
