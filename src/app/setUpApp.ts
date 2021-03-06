import express, { Application, Request, Response } from "express";
import userRouter from "#user/surfaces/express/routes";
import authRouter from "src/core/surfaces/express/auth/routes";
import folderRouter from "#folder/surfaces/express/routes";
import fileRouter from "#file/surfaces/express/routes";
import projectRouter from "#project/surfaces/express/routes";
import searchRouter from "#search/surfaces/express/routes";
import tripleRouter from "#triple/surfaces/express/routes";
import tagRouter from "#tags/surfaces/express/routes";
import groupedTriplesRouter from "#groupedTriples/surfaces/express/routes";
import parseToken from "src/core/surfaces/express/middleware/parseToken";
import cors from "cors";
import logger from "morgan";
import { errorHandler } from "src/core/surfaces/express/middleware/errorHandler";
import { corsOptions } from "./corsOptions";

const PREFIX = "/api/v1";

const setUpApp = (app: Application) => {
    // Body parsers
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Cors
    app.use(cors(corsOptions));

    // Logger
    app.use(logger("dev"));

    // Custom Middleware
    app.use(parseToken);

    //Routes
    app.get("/", (req: Request, res: Response) =>
        res.status(200).json({ success: true, message: "Server running" })
    );
    app.use(`${PREFIX}/user`, userRouter);
    app.use(`${PREFIX}/auth`, authRouter);
    app.use(`${PREFIX}/folder`, folderRouter);
    app.use(`${PREFIX}/file`, fileRouter);
    app.use(`${PREFIX}/project`, projectRouter);
    app.use(`${PREFIX}/search`, searchRouter);
    app.use(`${PREFIX}/triple`, tripleRouter);
    app.use(`${PREFIX}/tag`, tagRouter);
    app.use(`${PREFIX}/groupedTriples`, groupedTriplesRouter);

    // Error middleware
    app.use(errorHandler);
};

export default setUpApp;
