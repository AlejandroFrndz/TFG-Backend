import { IUserRepository, User } from "#user/domain";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import _ from "lodash";
import { ExpressCreateUserRequest, ExpressFindUserByIdRequest } from "./types";

const _findById =
    (userRepo: IUserRepository) =>
    async (req: ExpressFindUserByIdRequest, res: Response) => {
        const { id } = req.query;

        const userResponse = await userRepo.findById(id);

        if (userResponse.isFailure()) {
            const status =
                userResponse.error.type === "NotFoundError"
                    ? StatusCodes.NOT_FOUND
                    : StatusCodes.INTERNAL_SERVER_ERROR;
            return res
                .status(status)
                .json({ success: false, error: userResponse.error.message });
        }

        return res
            .status(StatusCodes.OK)
            .json({ success: true, user: userResponse.value });
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
