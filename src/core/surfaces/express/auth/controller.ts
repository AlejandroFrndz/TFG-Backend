import { Response } from "express";
import { IUserRepository } from "#user/domain";
import { ExpressSignInRequest, ExpressSingUpRequest } from "./types";
import { StatusCodes } from "http-status-codes";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "src/app/config";
import _ from "lodash";

const _singup =
    (userRepo: IUserRepository) =>
    async (req: ExpressSingUpRequest, res: Response) => {
        const { username, email } = req.body;

        const emailUserResponse = await userRepo.findByEmail(email);

        if (emailUserResponse.isSuccess()) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                error: "This email is already in use"
            });
        }

        const usernameUserResponse = await userRepo.findByUsername(username);

        if (usernameUserResponse.isSuccess()) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                error: "This username is already in use"
            });
        }

        const user = await userRepo.create({ ...req.body, isAdmin: false });

        return res
            .status(StatusCodes.CREATED)
            .json({
                success: true,
                value: _.pick(user.value, [
                    "id",
                    "username",
                    "email",
                    "isEmailVerfied",
                    "isAdmin"
                ])
            });
    };

const _singin =
    (userRepo: IUserRepository) =>
    async (req: ExpressSignInRequest, res: Response) => {
        const { email, password } = req.body;

        const userResponse = await userRepo.findByEmail(email);

        if (userResponse.isFailure()) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                error: "Incorrect username or password"
            });
        }

        const user = userResponse.value;

        const checkPassword = await bcrypt.compare(password, user.passwordHash);

        if (!checkPassword) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                error: "Incorrect username or password"
            });
        }

        const token = jwt.sign({ userId: user.id }, config.jwtSecret);

        return res.status(StatusCodes.OK).json({ success: true, token });
    };

export const AuthController = (userRepo: IUserRepository) => ({
    singup: _singup(userRepo),
    singin: _singin(userRepo)
});
