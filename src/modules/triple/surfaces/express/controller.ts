import { IProjectRepository } from "#project/domain/repo";
import { ITripleRepository } from "#triple/domain";
import { User } from "#user/domain";
import { NextFunction, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ForbiddenError } from "src/core/logic/errors";
import { ExpressGetAllForProjectRequest } from "./types";

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

export const TripleController = (
    tripleRepo: ITripleRepository,
    projectRepo: IProjectRepository
) => ({
    getAllForProject: _getAllForProject(tripleRepo, projectRepo)
});
