import { IProjectRepository } from "#project/domain/repo";
import { ISearchRepository } from "#search/domain";
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
        const { project: projectId } = req.body;

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

        const searchResponse = await searchRepo.create(req.body);

        if (searchResponse.isFailure()) {
            return next(searchResponse.error);
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
