import { IUserRepository, User } from "#user/domain";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import _ from "lodash";
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

        return res
            .status(StatusCodes.OK)
            .json({ success: true, value: user.value });
    };

const _me = () => async (req: Request, res: Response) => {
    const user = req.user as User;

    return res.status(StatusCodes.OK).json({
        success: true,
        user: _.omit(user, ["passwordHash", "code"])
    });
};

export const UserController = (userRepo: IUserRepository) => ({
    findById: _findById(userRepo),
    me: _me()
});
