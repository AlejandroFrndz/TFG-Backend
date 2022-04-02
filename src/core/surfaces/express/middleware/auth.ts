import { NextFunction, Request, Response } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";

export const requireUser = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (req.user === null) {
        return res
            .status(StatusCodes.UNAUTHORIZED)
            .json({ success: false, error: ReasonPhrases.UNAUTHORIZED });
    }

    return next();
};

export const requireAdmin = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (req.user === null) {
        return res
            .status(StatusCodes.UNAUTHORIZED)
            .json({ success: false, error: ReasonPhrases.UNAUTHORIZED });
    }

    if (!req.user.isAdmin) {
        return res
            .status(StatusCodes.FORBIDDEN)
            .json({ success: false, error: ReasonPhrases.FORBIDDEN });
    }

    return next();
};
