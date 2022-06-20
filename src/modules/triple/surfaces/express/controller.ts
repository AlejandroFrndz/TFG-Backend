import { IProjectRepository } from "#project/domain/repo";
import { ITripleRepository } from "#triple/domain";
import { User } from "#user/domain";
import { NextFunction, response, Response } from "express";
import { StatusCodes } from "http-status-codes";
import _ from "lodash";
import { ForbiddenError } from "src/core/logic/errors";
import {
    ExpressGetAllForProjectRequest,
    ExpressUpdateTagsRequest
} from "./types";

const _getAllForProject =
    (tripleRepo: ITripleRepository, projectRepo: IProjectRepository) =>
    async (
        req: ExpressGetAllForProjectRequest,
        res: Response,
        next: NextFunction
    ) => {
        const { projectId } = req.params;

        const projectResponse = await projectRepo.findById(projectId);

        if (projectResponse.isFailure()) {
            return next(projectResponse.error);
        }

        if (projectResponse.value.owner !== (req.user as User).id) {
            return next(
                new ForbiddenError(
                    "You cannot access a project that does not belong to you"
                )
            );
        }

        const triplesResponse = await tripleRepo.getAllForProject(projectId);

        if (triplesResponse.isFailure()) {
            return next(triplesResponse.error);
        }

        return res
            .status(StatusCodes.OK)
            .json({ success: true, triples: triplesResponse.value });
    };

const _update =
    (tripleRepo: ITripleRepository, projectRepo: IProjectRepository) =>
    async (
        req: ExpressUpdateTagsRequest,
        res: Response,
        next: NextFunction
    ) => {
        const { project, ...fields } = req.body;

        const projectResponse = await projectRepo.findById(project);

        if (projectResponse.isFailure()) {
            return next(projectResponse.error);
        }

        if (projectResponse.value.owner !== (req.user as User).id) {
            return next(
                new ForbiddenError(
                    "Cannot update a project that does not belong to you"
                )
            );
        }

        const updateResponse = await tripleRepo.update(fields);

        if (updateResponse.isFailure()) {
            return next(updateResponse.error);
        }

        return res
            .status(StatusCodes.OK)
            .json({ success: true, triple: updateResponse.value });
    };

export const TripleController = (
    tripleRepo: ITripleRepository,
    projectRepo: IProjectRepository
) => ({
    getAllForProject: _getAllForProject(tripleRepo, projectRepo),
    update: _update(tripleRepo, projectRepo)
});
