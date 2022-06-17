import { IGroupedTriplesRepository } from "#groupedTriples/domain";
import { IFileSystemGroupedTriplesService } from "#groupedTriples/services/FileSystem";
import { IProjectRepository } from "#project/domain/repo";
import { IFileSystemProjectService } from "#project/services/FileSystem";
import { ITripleRepository } from "#triple/domain";
import { ITripleFileMapper } from "#triple/infra/mapper";
import { IFileSystemTripleService } from "#triple/services/FileSystem";
import { User } from "#user/domain";
import { NextFunction, Response } from "express";
import { config } from "src/app/config";
import {
    BadRequestError,
    ForbiddenError,
    UnexpectedError
} from "src/core/logic/errors";
import { ExpressDownloadGroupedTriplesFileRequest } from "./types";

const _downloadFile =
    (
        projectRepo: IProjectRepository,
        groupedTriplesRepo: IGroupedTriplesRepository,
        fileSystemGroupedTriplesService: IFileSystemGroupedTriplesService,
        tripleRepo: ITripleRepository,
        fileSystemTripleService: IFileSystemTripleService,
        tripleFileMapper: ITripleFileMapper,
        fileSystemProjectService: IFileSystemProjectService
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

        switch (fileFormat) {
            case "tsv":
            case "csv":
                const groupedTriplesResponse =
                    await groupedTriplesRepo.getAllForProject(projectId);

                if (groupedTriplesResponse.isFailure()) {
                    return next(groupedTriplesResponse.error);
                }

                const writeFileResponse =
                    await fileSystemGroupedTriplesService.writeGroupedTriplesFile(
                        {
                            projectId,
                            triples: groupedTriplesResponse.value,
                            format: fileFormat
                        }
                    );

                if (writeFileResponse.isFailure()) {
                    return next(writeFileResponse.error);
                }

                fileName = writeFileResponse.value;
                break;
            case "txt":
                const triplesResponse = await tripleRepo.getAllForProject(
                    projectId
                );

                if (triplesResponse.isFailure()) {
                    return next(triplesResponse.error);
                }

                const triples = triplesResponse.value;

                const writeTriplesResponse =
                    await fileSystemTripleService.writeTriplesToFile(
                        projectId,
                        triples.map((triple) => tripleFileMapper.toFile(triple))
                    );

                if (writeTriplesResponse.isFailure()) {
                    return next(writeTriplesResponse.error);
                }

                const executeGroupFramesResponse =
                    await fileSystemProjectService.executeGroupFrames(
                        projectId,
                        true
                    );

                if (executeGroupFramesResponse.isFailure()) {
                    return next(executeGroupFramesResponse.error);
                }

                fileName = `${process.cwd()}${
                    config.isProdEnv ? "/dist" : ""
                }/src/scripts/groupFrames/${projectId}/download/results.txt`;
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

export const GroupedTriplesController = (
    projectRepo: IProjectRepository,
    groupedTriplesRepo: IGroupedTriplesRepository,
    fileSystemGroupedTriplesService: IFileSystemGroupedTriplesService,
    tripleRepo: ITripleRepository,
    fileSystemTripleService: IFileSystemTripleService,
    tripleFileMapper: ITripleFileMapper,
    fileSystemProjectService: IFileSystemProjectService
) => ({
    downloadFile: _downloadFile(
        projectRepo,
        groupedTriplesRepo,
        fileSystemGroupedTriplesService,
        tripleRepo,
        fileSystemTripleService,
        tripleFileMapper,
        fileSystemProjectService
    )
});
