import { IUserRepository } from "#user/domain";
import { typeORMUserRepository } from "#user/infra/postgres";
import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import { config } from "src/app/config";

const _parseToken =
    (userRepo: IUserRepository) =>
    async (req: Request, res: Response, next: NextFunction) => {
        const header = req.header("Authorization");

        if (!header) {
            req.user = null;
            return next();
        }

        const splitHeader = header.split(" ");

        if (splitHeader.length !== 2) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                error: "Invalid authentication header"
            });
        }

        const rawToken = splitHeader[1];

        try {
            const token = jwt.verify(rawToken, config.jwtSecret) as {
                userId: string;
            };
            const requestUserResponse = await userRepo.findById(token.userId);

            if (requestUserResponse.isFailure()) {
                return res.status(StatusCodes.UNAUTHORIZED).json({
                    success: false,
                    error: "The provided user does not exist"
                });
            }

            req.user = requestUserResponse.value;
            return next();
        } catch (error) {
            return res
                .status(StatusCodes.UNAUTHORIZED)
                .json({ success: false, error: "Invalid token" });
        }
    };

const parseToken = _parseToken(typeORMUserRepository);

export default parseToken;
