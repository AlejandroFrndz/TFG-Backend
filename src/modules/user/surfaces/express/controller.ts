import { IUserRepository } from "#user/domain";
import { Response } from "express";
import { ExpressCreateUserRequest, ExpressFindUserByIdRequest } from "./types";

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
    findById: _findById(userRepo)
});
