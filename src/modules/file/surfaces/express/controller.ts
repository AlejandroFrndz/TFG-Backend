import { IFileRepository } from "#file/domain";
import { Folder, IFolderRepository } from "#folder/domain";
import { User } from "#user/domain";
import { NextFunction, Response, Request } from "express";
import { StatusCodes } from "http-status-codes";
import { ForbiddenError } from "src/core/logic/errors";
import {
    ExpressCreateFileRequest,
    ExpressDeleteFileRequest,
    ExpressRenameFileRequest,
    ExpressUpdateParentRequest
} from "./types";

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
            console.error(fileResponse.error);
            return next(fileResponse.error);
        }

        return res
            .status(StatusCodes.CREATED)
            .json({ success: true, file: fileResponse.value });
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

const _updateParent =
    (fileRepo: IFileRepository, folderRepo: IFolderRepository) =>
    async (
        req: ExpressUpdateParentRequest,
        res: Response,
        next: NextFunction
    ) => {
        const { parentId } = req.body;
        const { fileId } = req.params;
        const user = req.user as User;

        const fileResponse = await fileRepo.findById(fileId);

        if (fileResponse.isFailure()) {
            console.error(fileResponse.error);
            return next(fileResponse.error);
        }

        if (fileResponse.value.owner !== user.id) {
            return next(
                new ForbiddenError(
                    "You don't have permission to edit this file"
                )
            );
        }

        let parent: Folder | null = null;

        if (parentId) {
            const parentResponse = await folderRepo.findById(parentId);

            if (parentResponse.isFailure()) {
                console.error(parentResponse.error);
                return next(parentResponse.error);
            }

            parent = parentResponse.value;

            if (parent.owner !== user.id) {
                return next(
                    new ForbiddenError(
                        "You dont haver permission to create items in this folder"
                    )
                );
            }
        }

        const updatedFileResponse = await fileRepo.updateParent(
            fileId,
            parentId
        );

        if (updatedFileResponse.isFailure()) {
            console.error(updatedFileResponse.error);
            return next(updatedFileResponse.error);
        }

        return res
            .status(StatusCodes.OK)
            .json({ success: true, file: updatedFileResponse.value });
    };

const _rename =
    (fileRepo: IFileRepository) =>
    async (
        req: ExpressRenameFileRequest,
        res: Response,
        next: NextFunction
    ) => {
        const { fileId } = req.params;
        const { name } = req.body;

        const fileResponse = await fileRepo.findById(fileId);

        if (fileResponse.isFailure()) {
            return next(fileResponse.error);
        }

        if (fileResponse.value.owner !== (req.user as User).id) {
            return next(
                new ForbiddenError(
                    "You don't have permission to edit this file"
                )
            );
        }

        const updatedFileResponse = await fileRepo.rename(fileId, name);

        if (updatedFileResponse.isFailure()) {
            return next(updatedFileResponse.error);
        }

        return res
            .status(StatusCodes.OK)
            .json({ success: true, file: updatedFileResponse.value });
    };

const _delete =
    (fileRepo: IFileRepository) =>
    async (
        req: ExpressDeleteFileRequest,
        res: Response,
        next: NextFunction
    ) => {
        const { fileId } = req.params;

        const fileResponse = await fileRepo.findById(fileId);

        if (fileResponse.isFailure()) {
            return next(fileResponse.error);
        }

        if (fileResponse.value.owner !== (req.user as User).id) {
            return next(
                new ForbiddenError(
                    "You don't have permission to delete this file"
                )
            );
        }

        const deleteResponse = await fileRepo.delete(fileId);

        if (deleteResponse.isFailure()) {
            return next(deleteResponse.error);
        }

        return res.status(StatusCodes.NO_CONTENT).send();
    };

export const FileController = (
    fileRepo: IFileRepository,
    folderRepo: IFolderRepository
) => ({
    create: _create(fileRepo, folderRepo),
    findAllForUser: _findAllForUser(fileRepo),
    updateParent: _updateParent(fileRepo, folderRepo),
    rename: _rename(fileRepo),
    delete: _delete(fileRepo)
});
