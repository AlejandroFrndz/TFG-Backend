import { Language } from "#project/domain";
import { IProjectRepository } from "#project/domain/repo";
import { S3Service } from "#project/services/AWS/S3";
import {
    executeParseAndIndex,
    FileSystemService,
    writeCorpusFiles
} from "#project/services/fileSystem";
import { User } from "#user/domain";
import { NextFunction, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ForbiddenError } from "src/core/logic/errors";
import {
    ExpressGetProjectRequest,
    ExpressUpdateProjectDetailsRequest,
    ExpressUploadCorpusRequest
} from "./types";

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

const _updateDetails =
    (projectRepo: IProjectRepository) =>
    async (
        req: ExpressUpdateProjectDetailsRequest,
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
                    "You cannot update a project that doesn't belong to you"
                )
            );
        }

        const updateResponse = await projectRepo.updateDetails(
            projectId,
            req.body
        );

        if (updateResponse.isFailure()) {
            return next(updateResponse.error);
        }

        return res
            .status(StatusCodes.OK)
            .json({ success: true, project: updateResponse.value });
    };

const _handleCorpusUpload =
    (projectRepo: IProjectRepository) =>
    async (
        req: ExpressUploadCorpusRequest,
        res: Response,
        next: NextFunction
    ) => {
        const { projectId } = req.params;
        const userId = (req.user as User).id;

        const projectResponse = await projectRepo.findById(projectId);

        if (projectResponse.isFailure()) {
            return next(projectResponse.error);
        }

        const project = projectResponse.value;

        const files = req.files as Express.Multer.File[];

        const writeCorpusResponse = await writeCorpusFiles(
            files,
            userId,
            projectId
        );

        if (writeCorpusResponse.isFailure()) {
            return next(writeCorpusResponse.error);
        }

        const parseAndIndexResponse = await executeParseAndIndex(
            project.language as Language,
            userId,
            project.id
        );

        if (parseAndIndexResponse.isFailure()) {
            return next(parseAndIndexResponse.error);
        }

        const s3UploadResponse = await S3Service.uploadProcessedCorpus(
            userId,
            project.id
        );

        if (s3UploadResponse.isFailure()) {
            return next(s3UploadResponse.error);
        }

        const updateProjectResponse = await projectRepo.finishCreation(
            project.id
        );

        if (updateProjectResponse.isFailure()) {
            return next(updateProjectResponse.error);
        }

        await FileSystemService.deleteProcessedCorpusDir(userId);

        res.status(StatusCodes.OK).json({
            success: true,
            project: updateProjectResponse.value
        });
    };

export const ProjectController = (projectRepo: IProjectRepository) => ({
    findById: _findById(projectRepo),
    updateDetails: _updateDetails(projectRepo),
    handleCorpusUpload: _handleCorpusUpload(projectRepo)
});
