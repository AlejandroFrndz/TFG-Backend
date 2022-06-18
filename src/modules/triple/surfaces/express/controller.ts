import { IFileSystemGroupedTriplesService } from "#groupedTriples/services/FileSystem";
import { IProjectRepository } from "#project/domain/repo";
import { ITripleRepository } from "#triple/domain";
import { IFileSystemTripleService } from "#triple/services/FileSystem";
import { User } from "#user/domain";
import { NextFunction, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
    BadRequestError,
    ForbiddenError,
    UnexpectedError
} from "src/core/logic/errors";
import {
    ExpressDownloadTriplesFileRequest,
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

const _downloadFile =
    (
        tripleRepo: ITripleRepository,
        projectRepo: IProjectRepository,
        fileSystemTripleService: IFileSystemTripleService,
        fileSystemGroupedTriplesService: IFileSystemGroupedTriplesService
    ) =>
    async (
        req: ExpressDownloadTriplesFileRequest,
        res: Response,
        next: NextFunction
    ) => {
        const { fileFormat } = req.query;

        if (!fileFormat) {
            return next(new BadRequestError("No file format specified"));
        }

        if (fileFormat !== "tsv" && fileFormat !== "csv") {
            return next(
                new BadRequestError(
                    `${fileFormat} format not valid for triples file`
                )
            );
        }

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

        const writeFileResponse =
            await fileSystemTripleService.writeTriplesToDownloadFile({
                projectId,
                triples: triplesResponse.value,
                format: fileFormat
            });

        if (writeFileResponse.isFailure()) {
            return next(writeFileResponse.error);
        }

        return res.download(writeFileResponse.value, async (error) => {
            await fileSystemGroupedTriplesService.deleteGroupedTriplesDir(
                projectId
            );

            if (error) {
                console.log(error);

                if (!res.headersSent) {
                    return next(new UnexpectedError(error));
                }
            }
        });
    };

export const TripleController = (
    tripleRepo: ITripleRepository,
    projectRepo: IProjectRepository,
    fileSystemTripleService: IFileSystemTripleService,
    fileSystemGroupedTriplesService: IFileSystemGroupedTriplesService
) => ({
    getAllForProject: _getAllForProject(tripleRepo, projectRepo),
    update: _update(tripleRepo, projectRepo),
    downloadFile: _downloadFile(
        tripleRepo,
        projectRepo,
        fileSystemTripleService,
        fileSystemGroupedTriplesService
    )
});
