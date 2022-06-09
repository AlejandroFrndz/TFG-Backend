import { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { MulterError } from "multer";
import { AnyError } from "src/core/logic/errors";

export const errorHandler: ErrorRequestHandler = (
    err: AnyError | MulterError,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
    let status: number;
    let message: string | null = null;
    let type: string | null = null;

    if (err instanceof MulterError) {
        status = StatusCodes.INTERNAL_SERVER_ERROR;
        message =
            "Something went wrong uploading your files. Please, refresh the page and try again later";
        type = "MulterError";
    } else if (!err.type) {
        status = StatusCodes.INTERNAL_SERVER_ERROR;
        message = "An unexpected error ocurred";
        type = "UnexpectedError";
    } else {
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
            case "PrimaryKeyConstraintError":
                status = StatusCodes.BAD_REQUEST;
                break;
            default:
                status = StatusCodes.INTERNAL_SERVER_ERROR;
        }
    }

    console.error(req, err.message, err);

    return res.status(status).json({
        success: false,
        error: message !== null ? message : err.message,
        type: (err as AnyError).type ? (err as AnyError).type : type
    });
};
