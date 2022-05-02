import { IProjectRepository } from "#project/domain/repo";
import { User } from "#user/domain";
import { NextFunction, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ForbiddenError } from "src/core/logic/errors";
import { ExpressGetProjectRequest } from "./types";

const _findById =
    (projectRepo: IProjectRepository) =>
    async (
        req: ExpressGetProjectRequest,
        res: Response,
        next: NextFunction
    ) => {
        const { projectId } = req.params;

        const projectResponse = await projectRepo.findById(projectId);

        if (projectResponse.isFailure()) {
            return next(projectResponse.error);
        }

        const project = projectResponse.value;

        if (project.owner !== (req.user as User).id) {
            return next(
                new ForbiddenError(
                    "You cannot access a project that doesn't belong to you"
                )
            );
        }

        return res.status(StatusCodes.OK).json({ success: true, project });
    };

export const ProjectController = (projectRepo: IProjectRepository) => ({
    findById: _findById(projectRepo)
});
