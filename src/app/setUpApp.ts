import express, {
    Application,
    ErrorRequestHandler,
    NextFunction,
    Request,
    Response
} from "express";
import userRouter from "#user/surfaces/express/routes";
import authRouter from "src/core/surfaces/express/auth/routes";
import folderRouter from "#folder/surfaces/express/routes";
import parseToken from "src/core/surfaces/express/middleware/parseToken";
import cors from "cors";
import { errorHandler } from "src/core/surfaces/express/middleware/errorHandler";

const PREFIX = "/api/v1";

const setUpApp = (app: Application) => {
    // Body parsers
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Cors
    app.use(
        cors({
            origin: [/^http:\/\/localhost:/, /^http:\/\/0.0.0.0:/]
        })
    );

    // Custom Middleware
    app.use(parseToken);

    //Routes
    app.get("/", (req: Request, res: Response) =>
        res.status(200).json({ success: true, message: "Server running" })
    );

    app.use(`${PREFIX}/user`, userRouter);
    app.use(`${PREFIX}/auth`, authRouter);
    app.use(`${PREFIX}/folder`, folderRouter);

    // Error middleware
    app.use(errorHandler);
};

export default setUpApp;
