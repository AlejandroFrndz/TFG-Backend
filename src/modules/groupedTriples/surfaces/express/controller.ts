import { IGroupedTriplesRepository } from "#groupedTriples/domain";
import { IFileSystemGroupedTriplesService } from "#groupedTriples/services/FileSystem";
import { IProjectRepository } from "#project/domain/repo";
import { ITripleRepository } from "#triple/domain";
import { User } from "#user/domain";
import { NextFunction, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
    BadRequestError,
    ForbiddenError,
    UnexpectedError
} from "src/core/logic/errors";
import {
    ExpressDownloadGroupedTriplesFileRequest,
    ExpressGetAllGroupedTriplesForProjectRequest
} from "./types";

const _downloadFile =
    (
        projectRepo: IProjectRepository,
        groupedTriplesRepo: IGroupedTriplesRepository,
        fileSystemGroupedTriplesService: IFileSystemGroupedTriplesService,
        tripleRepo: ITripleRepository
    ) =>
    async (
        req: ExpressDownloadGroupedTriplesFileRequest,
        res: Response,
        next: NextFunction
    ) => {
        const { fileFormat } = req.query;

        if (!fileFormat) {
            return next(new BadRequestError("No file format specified"));
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

        let fileName: string = "";

        const groupedTriplesResponse =
            await groupedTriplesRepo.getAllForProject(projectId);

        if (groupedTriplesResponse.isFailure()) {
            return next(groupedTriplesResponse.error);
        }

        if (groupedTriplesResponse.value.length === 0) {
            return next(
                new BadRequestError(
                    "This project does not have any grouped triples yet"
                )
            );
        }

        switch (fileFormat) {
            case "tsv":
            case "csv":
                const writeFileResponse =
                    await fileSystemGroupedTriplesService.writeGroupedTriplesFile(
                        {
                            projectId,
                            groupedTriples: groupedTriplesResponse.value,
                            format: fileFormat
                        }
                    );

                if (writeFileResponse.isFailure()) {
                    return next(writeFileResponse.error);
                }

                fileName = writeFileResponse.value;
                break;
            case "txt":
                const accuracyResponse = await tripleRepo.getAccuracyForProject(
                    projectId
                );

                if (accuracyResponse.isFailure()) {
                    return next(accuracyResponse.error);
                }

                const writeTxtFileResponse =
                    await fileSystemGroupedTriplesService.writeGroupedTriplesFile(
                        {
                            projectId,
                            format: "txt",
                            groupedTriples: groupedTriplesResponse.value,
                            accuracy: accuracyResponse.value
                        }
                    );

                if (writeTxtFileResponse.isFailure()) {
                    return next(writeTxtFileResponse.error);
                }

                fileName = writeTxtFileResponse.value;
                break;
            default:
                return next(
                    new BadRequestError(
                        `${fileFormat} format not valid for results file`
                    )
                );
        }

        return res.download(fileName, async (error) => {
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

const _getAllForProject =
    (
        groupedTriplesRepo: IGroupedTriplesRepository,
        projectRepo: IProjectRepository
    ) =>
    async (
        req: ExpressGetAllGroupedTriplesForProjectRequest,
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

        const groupedTriplesResponse =
            await groupedTriplesRepo.getAllForProject(projectId);

        if (groupedTriplesResponse.isFailure()) {
            return next(groupedTriplesResponse.error);
        }

        return res.status(StatusCodes.OK).json({
            success: true,
            groupedTriples: groupedTriplesResponse.value
        });
    };

export const GroupedTriplesController = (
    projectRepo: IProjectRepository,
    groupedTriplesRepo: IGroupedTriplesRepository,
    fileSystemGroupedTriplesService: IFileSystemGroupedTriplesService,
    tripleRepo: ITripleRepository
) => ({
    downloadFile: _downloadFile(
        projectRepo,
        groupedTriplesRepo,
        fileSystemGroupedTriplesService,
        tripleRepo
    ),
    getAllForProject: _getAllForProject(groupedTriplesRepo, projectRepo)
});
