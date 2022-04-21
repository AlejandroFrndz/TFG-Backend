import { NextFunction, Request, Response } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { ForbiddenError, UnauthorizedError } from "src/core/logic/errors";

export const requireUser = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (req.user === null) {
        return next(new UnauthorizedError(ReasonPhrases.UNAUTHORIZED));
    }

    return next();
};

export const requireAdmin = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (req.user === null) {
        return next(new UnauthorizedError(ReasonPhrases.UNAUTHORIZED));
    }

    if (!req.user.isAdmin) {
        return next(new ForbiddenError(ReasonPhrases.FORBIDDEN));
    }

    return next();
};
