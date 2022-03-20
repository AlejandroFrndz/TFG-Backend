import { IUserRepository } from "#user/domain";
import { Response } from "express";
import { ExpressCreateUserRequest, ExpressFindUserByIdRequest } from "./types";

const _create =
    (userRepo: IUserRepository) =>
    async (req: ExpressCreateUserRequest, res: Response) => {
        const { username, email } = req.body;

        const emailUser = await userRepo.findByEmail(email);

        if (emailUser.isSuccess()) {
            return res.status(400).json({
                success: false,
                error: "This email is already in use"
            });
        }

        const usernameUser = await userRepo.findByUsername(username);

        if (usernameUser.isSuccess()) {
            return res.status(400).json({
                success: false,
                error: "This username is already in use"
            });
        }

        const user = await userRepo.create(req.body);

        return res.status(201).json({ success: true, value: user.value });
    };

const _findById =
    (userRepo: IUserRepository) =>
    async (req: ExpressFindUserByIdRequest, res: Response) => {
        const { id } = req.query;

        const user = await userRepo.findById(id);

        if (user.isFailure()) {
            const status = user.error.type === "NotFoundError" ? 404 : 500;
            return res
                .status(status)
                .json({ success: false, error: user.error.message });
        }

        return res.status(200).json({ success: true, value: user.value });
    };

export const UserController = (userRepo: IUserRepository) => ({
    create: _create(userRepo),
    findById: _findById(userRepo)
});
