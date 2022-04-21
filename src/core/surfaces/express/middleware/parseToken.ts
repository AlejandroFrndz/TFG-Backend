import { IUserRepository } from "#user/domain";
import { typeORMUserRepository } from "#user/infra/postgres";
import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import { config } from "src/app/config";
import { UnauthorizedError } from "src/core/logic/errors";

const _parseToken =
    (userRepo: IUserRepository) =>
    async (req: Request, _res: Response, next: NextFunction) => {
        const header = req.header("Authorization");

        if (!header) {
            req.user = null;
            return next();
        }

        const splitHeader = header.split(" ");

        if (splitHeader.length !== 2) {
            return next(new UnauthorizedError("Invalid authentication header"));
        }

        const rawToken = splitHeader[1];

        try {
            const token = jwt.verify(rawToken, config.jwtSecret) as {
                userId: string;
            };
            const requestUserResponse = await userRepo.findById(token.userId);

            if (requestUserResponse.isFailure()) {
                return next(
                    new UnauthorizedError("The provided user does not exist")
                );
            }

            req.user = requestUserResponse.value;
            return next();
        } catch (error) {
            return next(new UnauthorizedError("Invalid token"));
        }
    };

const parseToken = _parseToken(typeORMUserRepository);

export default parseToken;
