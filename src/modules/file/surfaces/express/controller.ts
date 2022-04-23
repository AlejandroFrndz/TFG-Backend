import { IFileRepository } from "#file/domain";
import { IFolderRepository } from "#folder/domain";
import { User } from "#user/domain";
import { NextFunction, Response, Request } from "express";
import { StatusCodes } from "http-status-codes";
import { ForbiddenError } from "src/core/logic/errors";
import { ExpressCreateFileRequest } from "./types";

const _create =
    (fileRepo: IFileRepository, folderRepo: IFolderRepository) =>
    async (
        req: ExpressCreateFileRequest,
        res: Response,
        next: NextFunction
    ) => {
        const { parent } = req.body;

        if (parent) {
            const parentResponse = await folderRepo.findById(parent);

            if (parentResponse.isFailure()) {
                return next(parentResponse.error);
            }

            if (parentResponse.value.owner !== req.user?.id) {
                return next(
                    new ForbiddenError(
                        "You cannot create items in a folder that doesn't belong to you"
                    )
                );
            }
        }

        const fileResponse = await fileRepo.create({
            ...req.body,
            owner: (req.user as User).id
        });

        if (fileResponse.isFailure()) {
            return next(fileResponse.error);
        }

        return res
            .status(StatusCodes.CREATED)
            .json({ success: true, folder: fileResponse.value });
    };

const _findAllForUser =
    (fileRepo: IFileRepository) =>
    async (req: Request, res: Response, next: NextFunction) => {
        const filesResponse = await fileRepo.findAllForUser(
            (req.user as User).id
        );

        if (filesResponse.isFailure()) {
            return next(filesResponse.error);
        }

        return res
            .status(StatusCodes.OK)
            .json({ success: true, files: filesResponse.value });
    };

export const FileController = (
    fileRepo: IFileRepository,
    folderRepo: IFolderRepository
) => ({
    create: _create(fileRepo, folderRepo),
    findAllForUser: _findAllForUser(fileRepo)
});
