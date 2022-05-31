import { IProjectRepository } from "#project/domain/repo";
import {
    CreateSearchParams,
    ISearchRepository,
    SearchParameterType
} from "#search/domain";
import { User } from "#user/domain";
import { Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { ForbiddenError } from "src/core/logic/errors";
import { ExpressCreateSearchRequest } from "./types";

const _create =
    (searchRepo: ISearchRepository, projectRepo: IProjectRepository) =>
    async (
        req: ExpressCreateSearchRequest,
        res: Response,
        next: NextFunction
    ) => {
        const {
            project: projectId,
            noun1,
            verb,
            noun2,
            isUsingSynt
        } = req.body;

        const projectResponse = await projectRepo.findById(projectId);

        if (projectResponse.isFailure()) {
            return next(projectResponse.error);
        }

        if (projectResponse.value.owner !== (req.user as User).id) {
            return next(
                new ForbiddenError(
                    "You cannot access a project that doesn't belong to you"
                )
            );
        }

        if (noun1.type === SearchParameterType.File) {
            // Handle S3 file upload
        }

        if (verb.type === SearchParameterType.File) {
            // Handle S3 file upload
        }

        if (noun2.type === SearchParameterType.File) {
            // Handle S3 file upload
        }

        const searchResponse = await searchRepo.create({
            noun1: {
                type: noun1.type,
                value: noun1.value === null ? "" : noun1.value
            },
            verb: {
                type: verb.type,
                value: verb.value === null ? "" : verb.value
            },
            noun2: {
                type: noun2.type,
                value: noun2.value === null ? "" : noun2.value
            },
            isUsingSynt,
            project: projectId
        });

        if (searchResponse.isFailure()) {
            next(searchResponse.error);
        }

        return res
            .status(StatusCodes.CREATED)
            .json({ success: true, search: searchResponse.value });
    };

export const SearchController = (
    searchRepo: ISearchRepository,
    projectRepo: IProjectRepository
) => ({
    create: _create(searchRepo, projectRepo)
});
