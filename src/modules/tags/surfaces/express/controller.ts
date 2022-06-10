import { ILexicalDomainTagRepository } from "#tags/modules/LexicalDomain/domain";
import { ISemanticCategoryTagRepository } from "#tags/modules/SemanticCategories/domain";
import { ISemanticRoleTagRepository } from "#tags/modules/SemanticRoles/domain/repo";
import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { UnexpectedError } from "src/core/logic/errors";

const _findAll =
    (
        lexicalDomainRepo: ILexicalDomainTagRepository,
        semanticCategoryRepo: ISemanticCategoryTagRepository,
        semanticRoleRepo: ISemanticRoleTagRepository
    ) =>
    async (req: Request, res: Response, next: NextFunction) => {
        const [
            lexicalDomainTagsResponse,
            semanticCategoryTagsResponse,
            semanticRoleTagsResponse
        ] = await Promise.all([
            lexicalDomainRepo.findAll(),
            semanticCategoryRepo.findAll(),
            semanticRoleRepo.findAll()
        ]);

        if (
            lexicalDomainTagsResponse.isFailure() ||
            semanticCategoryTagsResponse.isFailure() ||
            semanticRoleTagsResponse.isFailure()
        ) {
            return next(new UnexpectedError());
        }

        return res.status(StatusCodes.OK).json({
            success: true,
            lexicalDomain: lexicalDomainTagsResponse.value,
            semanticCategory: semanticCategoryTagsResponse.value,
            semanticRole: semanticRoleTagsResponse.value
        });
    };

export const TagsController = (
    lexicalDomainRepo: ILexicalDomainTagRepository,
    semanticCategoryRepo: ISemanticCategoryTagRepository,
    semanticRoleRepo: ISemanticRoleTagRepository
) => ({
    findAll: _findAll(lexicalDomainRepo, semanticCategoryRepo, semanticRoleRepo)
});
