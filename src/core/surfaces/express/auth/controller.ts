import { NextFunction, Response } from "express";
import { IUserRepository } from "#user/domain";
import { ExpressSignInRequest, ExpressSingUpRequest } from "./types";
import { StatusCodes } from "http-status-codes";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "src/app/config";
import _ from "lodash";
import { BadRequestError } from "src/core/logic/errors";

const _singup =
    (userRepo: IUserRepository) =>
    async (req: ExpressSingUpRequest, res: Response, next: NextFunction) => {
        const { username, email } = req.body;

        const emailUserResponse = await userRepo.findByEmail(email);

        if (emailUserResponse.isSuccess()) {
            return next(new BadRequestError("This email is already in use"));
        }

        const usernameUserResponse = await userRepo.findByUsername(username);

        if (usernameUserResponse.isSuccess()) {
            return next(new BadRequestError("This username is already in use"));
        }

        const userResponse = await userRepo.create({
            ...req.body,
            isAdmin: false
        });

        if (userResponse.isFailure()) {
            return next(userResponse.error);
        }

        const token = jwt.sign(
            { userId: userResponse.value.id },
            config.jwtSecret
        );

        return res.status(StatusCodes.CREATED).json({
            success: true,
            token
        });
    };

const _singin =
    (userRepo: IUserRepository) =>
    async (req: ExpressSignInRequest, res: Response, next: NextFunction) => {
        const { email, password } = req.body;

        const userResponse = await userRepo.findByEmail(email);

        if (userResponse.isFailure()) {
            return next(new BadRequestError("Incorrect email or password"));
        }

        const user = userResponse.value;

        const checkPassword = await bcrypt.compare(password, user.passwordHash);

        if (!checkPassword) {
            return next(new BadRequestError("Incorrect email or password"));
        }

        const token = jwt.sign({ userId: user.id }, config.jwtSecret);

        return res.status(StatusCodes.OK).json({ success: true, token });
    };

export const AuthController = (userRepo: IUserRepository) => ({
    singup: _singup(userRepo),
    singin: _singin(userRepo)
});
