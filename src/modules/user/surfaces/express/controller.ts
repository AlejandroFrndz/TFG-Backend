import { IFileRepository } from "#file/domain";
import { IFolderRepository } from "#folder/domain";
import { IUserRepository, User } from "#user/domain";
import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import _ from "lodash";
import { ExpressFindUserByIdRequest } from "./types";

const _findById =
    (userRepo: IUserRepository) =>
    async (
        req: ExpressFindUserByIdRequest,
        res: Response,
        next: NextFunction
    ) => {
        const { id } = req.query;

        const userResponse = await userRepo.findById(id);

        if (userResponse.isFailure()) {
            return next(userResponse.error);
        }

        return res
            .status(StatusCodes.OK)
            .json({ success: true, user: userResponse.value });
    };

const _me =
    (folderRepo: IFolderRepository, fileRepo: IFileRepository) =>
    async (req: Request, res: Response, next: NextFunction) => {
        const user = req.user as User;

        const foldersResponse = await folderRepo.findAllForUser(user.id);

        if (foldersResponse.isFailure()) {
            return next(foldersResponse.error);
        }

        const filesResponse = await fileRepo.findAllForUser(user.id);

        if (filesResponse.isFailure()) {
            return next(filesResponse.error);
        }

        return res.status(StatusCodes.OK).json({
            success: true,
            user: _.omit(user, ["passwordHash", "code"]),
            folders: foldersResponse.value,
            files: filesResponse.value
        });
    };

export const UserController = (
    userRepo: IUserRepository,
    folderRepo: IFolderRepository,
    fileRepo: IFileRepository
) => ({
    findById: _findById(userRepo),
    me: _me(folderRepo, fileRepo)
});
