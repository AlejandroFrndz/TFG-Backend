import { FolderResponse, IFolderRepository } from "#folder/domain";
import { User } from "#user/domain";
import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ForbiddenError } from "src/core/logic/errors";
import {
    ExpressCreateFolderRequest,
    ExpressDeleteFolderRequest,
    ExpressRenameFolderRequest,
    ExpressUpdateParentRequest
} from "./types";

const _create =
    (folderRepo: IFolderRepository) =>
    async (
        req: ExpressCreateFolderRequest,
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

        const folderResponse = await folderRepo.create({
            ...req.body,
            owner: (req.user as User).id // We can safely type this because express middleware will make sure a user exits in the request, although typescript isn't aware of this
        });

        if (folderResponse.isFailure()) {
            return next(folderResponse.error);
        }

        return res
            .status(StatusCodes.CREATED)
            .json({ success: true, folder: folderResponse.value });
    };

const _findAllForUser =
    (folderRepo: IFolderRepository) =>
    async (req: Request, res: Response, next: NextFunction) => {
        const foldersResponse = await folderRepo.findAllForUser(
            (req.user as User).id
        );

        if (foldersResponse.isFailure()) {
            return next(foldersResponse.error);
        }

        return res
            .status(StatusCodes.OK)
            .json({ success: true, folders: foldersResponse.value });
    };

const _updateParent =
    (folderRepo: IFolderRepository) =>
    async (
        req: ExpressUpdateParentRequest,
        res: Response,
        next: NextFunction
    ) => {
        const { newParentId } = req.body;
        const { folderId } = req.params;

        const childResponse = await folderRepo.findById(folderId);

        if (childResponse.isFailure()) {
            return next(childResponse.error);
        }

        let newParentResponse: FolderResponse | null = null;

        if (newParentId) {
            newParentResponse = await folderRepo.findById(newParentId);

            if (newParentResponse.isFailure()) {
                return next(newParentResponse.error);
            }
        }

        if (
            childResponse.value.owner !== req.user?.id ||
            (newParentResponse !== null &&
                newParentResponse.value.owner !== req.user?.id)
        ) {
            return next(
                new ForbiddenError(
                    "You don't haver permission to update this folder"
                )
            );
        }

        const updatedFolderResponse = await folderRepo.updateParent(
            folderId,
            newParentId
        );

        if (updatedFolderResponse.isFailure()) {
            return next(updatedFolderResponse);
        }

        return res
            .status(StatusCodes.OK)
            .json({ success: true, folder: updatedFolderResponse.value });
    };

const _rename =
    (folderRepo: IFolderRepository) =>
    async (
        req: ExpressRenameFolderRequest,
        res: Response,
        next: NextFunction
    ) => {
        const { folderId } = req.params;
        const { name } = req.body;

        const folderResponse = await folderRepo.findById(folderId);

        if (folderResponse.isFailure()) {
            return next(folderResponse.error);
        }

        if (folderResponse.value.owner !== req.user?.id) {
            return next(
                new ForbiddenError(
                    "You don't haver permission to update this folder"
                )
            );
        }

        const updateResponse = await folderRepo.rename(folderId, name);

        if (updateResponse.isFailure()) {
            return next(updateResponse.error);
        }

        return res
            .status(StatusCodes.OK)
            .json({ success: true, folder: updateResponse.value });
    };

const _delete =
    (folderRepo: IFolderRepository) =>
    async (
        req: ExpressDeleteFolderRequest,
        res: Response,
        next: NextFunction
    ) => {
        const { folderId } = req.params;

        const folderResponse = await folderRepo.findById(folderId);

        if (folderResponse.isFailure()) {
            return next(folderResponse.error);
        }

        if (folderResponse.value.owner !== (req.user as User).id) {
            return next(
                new ForbiddenError(
                    "You don't have permission to delete this resource"
                )
            );
        }

        const deleteResponse = await folderRepo.delete(folderId);

        if (deleteResponse.isFailure()) {
            return next(deleteResponse.error);
        }

        return res.status(StatusCodes.NO_CONTENT).send();
    };

export const FolderController = (folderRepo: IFolderRepository) => ({
    create: _create(folderRepo),
    findAllForUser: _findAllForUser(folderRepo),
    updateParent: _updateParent(folderRepo),
    rename: _rename(folderRepo),
    delete: _delete(folderRepo)
});
