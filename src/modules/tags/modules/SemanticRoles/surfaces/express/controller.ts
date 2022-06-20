import { NextFunction, Response, Request } from "express";
import { StatusCodes } from "http-status-codes";
import { ISemanticRoleTagRepository } from "../../domain/repo";
import {
    ExpressCreateSemanticRoleTagRequest,
    ExpressDeleteSemanticRoleTagRequest
} from "./types";

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

const _findAll =
    (repo: ISemanticRoleTagRepository) =>
    async (req: Request, res: Response, next: NextFunction) => {
        const response = await repo.findAll();

        if (response.isFailure()) {
            return next(response.error);
        }

        return res
            .status(StatusCodes.OK)
            .json({ success: true, tags: response.value });
    };

const _delete =
    (repo: ISemanticRoleTagRepository) =>
    async (
        req: ExpressDeleteSemanticRoleTagRequest,
        res: Response,
        next: NextFunction
    ) => {
        const { tagName } = req.params;

        const response = await repo.delete(tagName);

        if (response.isFailure()) {
            return next(response.error);
        }

        return res.sendStatus(StatusCodes.NO_CONTENT);
    };
export const SemanticRoleTagController = (
    repo: ISemanticRoleTagRepository
) => ({
    create: _create(repo),
    findAll: _findAll(repo),
    delete: _delete(repo)
});
