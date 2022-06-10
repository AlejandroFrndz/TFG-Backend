import { ILexicalDomainTagRepository } from "#tags/modules/LexicalDomain/domain";
import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ExpressCreateLexicalDomainTagRequest } from "./types";

const _create =
    (repo: ILexicalDomainTagRepository) =>
    async (
        req: ExpressCreateLexicalDomainTagRequest,
        res: Response,
        next: NextFunction
    ) => {
        const { tag, protoVerbs } = req.body;

        const createResponse = await repo.create({
            tag,
            protoVerbs: protoVerbs ?? null
        });

        if (createResponse.isFailure()) {
            return next(createResponse.error);
        }

        return res
            .status(StatusCodes.CREATED)
            .json({ success: true, tag: createResponse.value });
    };

const _findAll =
    (repo: ILexicalDomainTagRepository) =>
    async (req: Request, res: Response, next: NextFunction) => {
        const response = await repo.findAll();

        if (response.isFailure()) {
            return next(response.error);
        }

        return res
            .status(StatusCodes.OK)
            .json({ success: true, tags: response.value });
    };

export const LexicalDomainTagController = (
    repo: ILexicalDomainTagRepository
) => ({
    create: _create(repo),
    findAll: _findAll(repo)
});
