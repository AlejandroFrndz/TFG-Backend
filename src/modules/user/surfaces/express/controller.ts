import { IFileRepository } from "#file/domain";
import { IFolderRepository } from "#folder/domain";
import { IUserRepository, User } from "#user/domain";
import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import _ from "lodash";
import { BadRequestError } from "src/core/logic/errors";
import {
    ExpressAdminDeleteRequest,
    ExpressAdminUpdateUserRequest,
    ExpressFindUserByIdRequest,
    ExpressUpdateUserRequest
} from "./types";

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

const _update =
    (userRepo: IUserRepository) =>
    async (
        req: ExpressUpdateUserRequest,
        res: Response,
        next: NextFunction
    ) => {
        const params = req.body;
        const user = req.user as User;

        if (params.username) {
            const usernameResponse = await userRepo.findByUsername(
                params.username
            );

            if (usernameResponse.isSuccess()) {
                return next(
                    new BadRequestError("This username is already in use")
                );
            }

            if (
                usernameResponse.isFailure() &&
                usernameResponse.error.type !== "NotFoundError"
            ) {
                return next(usernameResponse.error);
            }
        }

        if (params.email) {
            const emailResponse = await userRepo.findByEmail(params.email);

            if (emailResponse.isSuccess()) {
                return next(
                    new BadRequestError("This email is already in use")
                );
            }

            if (
                emailResponse.isFailure() &&
                emailResponse.error.type !== "NotFoundError"
            ) {
                return next(emailResponse.error);
            }
        }

        const userResponse = await userRepo.update(user.id, params);

        if (userResponse.isFailure()) {
            return next(userResponse.error);
        }

        return res.status(StatusCodes.OK).json({
            success: true,
            user: _.omit(userResponse.value, ["passwordHash", "code"])
        });
    };

const _delete =
    (userRepo: IUserRepository) =>
    async (req: Request, res: Response, next: NextFunction) => {
        const user = req.user as User;

        const deleteResponse = await userRepo.delete(user.id);

        if (deleteResponse.isFailure()) {
            return next(deleteResponse.error);
        }

        return res.sendStatus(StatusCodes.NO_CONTENT);
    };

const _adminFindAll =
    (userRepo: IUserRepository) =>
    async (req: Request, res: Response, next: NextFunction) => {
        const usersResponse = await userRepo.findAll();

        if (usersResponse.isFailure()) {
            return next(usersResponse.error);
        }

        return res.status(StatusCodes.OK).json({
            success: true,
            users: usersResponse.value.map((user) =>
                _.omit(user, ["passwordHash"])
            )
        });
    };

const _adminUpdate =
    (userRepo: IUserRepository) =>
    async (
        req: ExpressAdminUpdateUserRequest,
        res: Response,
        next: NextFunction
    ) => {
        const { userId } = req.params;
        const params = req.body;

        if (params.username) {
            const usernameResponse = await userRepo.findByUsername(
                params.username
            );

            if (usernameResponse.isSuccess()) {
                return next(
                    new BadRequestError("This username is already in use")
                );
            }

            if (
                usernameResponse.isFailure() &&
                usernameResponse.error.type !== "NotFoundError"
            ) {
                return next(usernameResponse.error);
            }
        }

        if (params.email) {
            const emailResponse = await userRepo.findByEmail(params.email);

            if (emailResponse.isSuccess()) {
                return next(
                    new BadRequestError("This email is already in use")
                );
            }

            if (
                emailResponse.isFailure() &&
                emailResponse.error.type !== "NotFoundError"
            ) {
                return next(emailResponse.error);
            }
        }

        const userResponse = await userRepo.update(userId, params);

        if (userResponse.isFailure()) {
            return next(userResponse.error);
        }

        return res.status(StatusCodes.OK).json({
            success: true,
            user: _.omit(userResponse.value, ["passwordHash"])
        });
    };

const _adminDelete =
    (userRepo: IUserRepository) =>
    async (
        req: ExpressAdminDeleteRequest,
        res: Response,
        next: NextFunction
    ) => {
        const { userId } = req.params;

        const deleteResponse = await userRepo.delete(userId);

        if (deleteResponse.isFailure()) {
            return next(deleteResponse.error);
        }

        return res.sendStatus(StatusCodes.NO_CONTENT);
    };

export const UserController = (
    userRepo: IUserRepository,
    folderRepo: IFolderRepository,
    fileRepo: IFileRepository
) => ({
    findById: _findById(userRepo),
    me: _me(folderRepo, fileRepo),
    update: _update(userRepo),
    delete: _delete(userRepo),
    adminFindAll: _adminFindAll(userRepo),
    adminUpdate: _adminUpdate(userRepo),
    adminDelete: _adminDelete(userRepo)
});
