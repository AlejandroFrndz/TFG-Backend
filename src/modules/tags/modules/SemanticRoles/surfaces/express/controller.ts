import { NextFunction, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ISemanticRoleTagRepository } from "../../domain/repo";
import { ExpressCreateSemanticRoleTagRequest } from "./types";

const _create =
    (repo: ISemanticRoleTagRepository) =>
    async (
        req: ExpressCreateSemanticRoleTagRequest,
        res: Response,
        next: NextFunction
    ) => {
        const { tag, definition } = req.body;

        const createResponse = await repo.create({
            tag,
            definition: definition ?? null
        });

        if (createResponse.isFailure()) {
            return next(createResponse.error);
        }

        return res
            .status(StatusCodes.CREATED)
            .json({ success: true, tag: createResponse.value });
    };

export const SemanticRoleTagController = (
    repo: ISemanticRoleTagRepository
) => ({ create: _create(repo) });
