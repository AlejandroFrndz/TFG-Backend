import { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AnyError } from "src/core/logic/errors";

export const errorHandler: ErrorRequestHandler = (
    err: AnyError,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
    let status: number;

    switch (err.type) {
        case "NotFoundError":
            status = StatusCodes.NOT_FOUND;
            break;
        case "ForbiddenError":
            status = StatusCodes.FORBIDDEN;
            break;
        case "BadRequestError":
            status = StatusCodes.BAD_REQUEST;
            break;
        default:
            status = StatusCodes.INTERNAL_SERVER_ERROR;
    }

    console.error(req, err.message, err);

    return res.status(status).json({ successs: false, error: err.message });
};
