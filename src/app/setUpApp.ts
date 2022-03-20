import express, { Application, Request, Response } from "express";

import userRouter from "#user/surfaces/express/routes";

const PREFIX = "/api/v1";

const setUpApp = (app: Application) => {
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    //Routes
    app.get("/", (req: Request, res: Response) =>
        res
            .status(200)
            .json({ success: true, value: { message: "Server running" } })
    );
    app.use(`${PREFIX}/user`, userRouter);
};

export default setUpApp;
