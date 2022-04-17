import { IFolderRepository } from "#folder/domain";
import { User } from "#user/domain";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ExpressCreateFolderRequest } from "./types";

const _create =
    (folderRepo: IFolderRepository) =>
    async (req: ExpressCreateFolderRequest, res: Response) => {
        const { parent } = req.body;

        if (parent) {
            const parentResponse = await folderRepo.findById(parent);

            if (parentResponse.isFailure()) {
                const status =
                    parentResponse.error.type === "NotFoundError"
                        ? StatusCodes.NOT_FOUND
                        : StatusCodes.INTERNAL_SERVER_ERROR;
                return res.status(status).json({
                    success: false,
                    error: parentResponse.error.message
                });
            }

            if (parentResponse.value.owner !== req.user?.id) {
                return res.status(StatusCodes.FORBIDDEN).json({
                    success: false,
                    error: "You cannot crete items in a folder that doesn't belong to you"
                });
            }
        }

        const folderResponse = await folderRepo.create({
            ...req.body,
            owner: (req.user as User).id // We can safely type this because express middleware will make sure a user exits in the request, although typescript isn't aware of this
        });

        if (folderResponse.isFailure()) {
            return res
                .status(StatusCodes.INTERNAL_SERVER_ERROR)
                .json({ success: false, error: folderResponse.error.message });
        }

        return res
            .status(StatusCodes.CREATED)
            .json({ success: true, folder: folderResponse.value });
    };

const _findAllForUser =
    (folderRepo: IFolderRepository) => async (req: Request, res: Response) => {
        const foldersResponse = await folderRepo.findAllForUser(
            (req.user as User).id
        );

        if (foldersResponse.isFailure()) {
            return res
                .status(StatusCodes.INTERNAL_SERVER_ERROR)
                .json({ success: false, error: foldersResponse.error.message });
        }

        return res
            .status(StatusCodes.OK)
            .json({ success: true, folders: foldersResponse.value });
    };

export const FolderController = (folderRepo: IFolderRepository) => ({
    create: _create(folderRepo),
    findAllForUser: _findAllForUser(folderRepo)
});
