import { NextFunction, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ISemanticCategoryTagRepository } from "../../domain";
import { ExpressCreateSemanticCategoryTagRequest } from "./types";

const _create =
    (repo: ISemanticCategoryTagRepository) =>
    async (
        req: ExpressCreateSemanticCategoryTagRequest,
        res: Response,
        next: NextFunction
    ) => {
        const { tag, ancestor } = req.body;

        const createResponse = await repo.create({ tag, ancestor });

        if (createResponse.isFailure()) {
            return next(createResponse.error);
        }

        return res
            .status(StatusCodes.CREATED)
            .json({ success: true, tag: createResponse.value });
    };

export const SemanticCategoryTagController = (
    repo: ISemanticCategoryTagRepository
) => ({
    create: _create(repo)
});
