import { Language } from "#project/domain";
import { IProjectRepository } from "#project/domain/repo";
import { S3ProjectService } from "#project/services/AWS/S3";
import { FileSystemProjectService } from "#project/services/FileSystem";
import { ISearchRepository } from "#search/domain";
import { IS3SearchService } from "#search/services/AWS/S3";
import { IFileSystemSearchService } from "#search/services/FileSystem";
import { User } from "#user/domain";
import { NextFunction, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ForbiddenError } from "src/core/logic/errors";
import {
    ExpressGetProjectRequest,
    ExpressRunSearchesRequest,
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

        const writeCorpusResponse =
            await FileSystemProjectService.writeCorpusFiles(
                files,
                userId,
                projectId
            );

        if (writeCorpusResponse.isFailure()) {
            return next(writeCorpusResponse.error);
        }

        const parseAndIndexResponse =
            await FileSystemProjectService.executeParseAndIndex(
                project.language as Language,
                userId,
                project.id
            );

        if (parseAndIndexResponse.isFailure()) {
            return next(parseAndIndexResponse.error);
        }

        const s3UploadResponse = await S3ProjectService.uploadProcessedCorpus(
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

        await FileSystemProjectService.deleteProcessedCorpusDir(userId);

        res.status(StatusCodes.OK).json({
            success: true,
            project: updateProjectResponse.value
        });
    };

const _runSearches =
    (
        searchRepo: ISearchRepository,
        projectRepo: IProjectRepository,
        S3SearchService: IS3SearchService,
        FileSystemSearchService: IFileSystemSearchService
    ) =>
    async (
        req: ExpressRunSearchesRequest,
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

        const searchesResponse = await searchRepo.getAllForProject(projectId);

        if (searchesResponse.isFailure()) {
            return next(searchesResponse.error);
        }

        const project = projectResponse.value;
        const searches = searchesResponse.value;

        const corpusResponse = await S3SearchService.getProcessedCorpus({
            userId: project.owner,
            projectId: project.id
        });

        if (corpusResponse.isFailure()) {
            return next(corpusResponse.error);
        }

        for (const search of searches) {
            const { noun1, verb, noun2 } = search;

            // If any of the parameters is a file, we must access S3 and retrieve the file before running the search script
            if (noun1.type === "file") {
                const noun1FileS3Response =
                    await S3SearchService.getParameterFile(
                        search.id,
                        "noun1",
                        noun1.value
                    );

                if (noun1FileS3Response.isFailure()) {
                    return next(noun1FileS3Response.error);
                }

                const noun1FileFileSystemResponse =
                    await FileSystemSearchService.writeParameterFile(
                        project.id,
                        search.id,
                        "noun1",
                        noun1FileS3Response.value
                    );

                if (noun1FileFileSystemResponse.isFailure()) {
                    return next(noun1FileFileSystemResponse.error);
                }
            }

            if (verb.type === "file") {
                const verbFileS3Response =
                    await S3SearchService.getParameterFile(
                        search.id,
                        "verb",
                        verb.value
                    );

                if (verbFileS3Response.isFailure()) {
                    return next(verbFileS3Response.error);
                }

                const verbFileFileSystemResponse =
                    await FileSystemSearchService.writeParameterFile(
                        project.id,
                        search.id,
                        "verb",
                        verbFileS3Response.value
                    );

                if (verbFileFileSystemResponse.isFailure()) {
                    return next(verbFileFileSystemResponse.error);
                }
            }

            if (noun2.type === "file") {
                const noun2FileS3Response =
                    await S3SearchService.getParameterFile(
                        search.id,
                        "noun2",
                        noun2.value
                    );

                if (noun2FileS3Response.isFailure()) {
                    return next(noun2FileS3Response.error);
                }

                const noun2FileFileSystemResponse =
                    await FileSystemSearchService.writeParameterFile(
                        project.id,
                        search.id,
                        "noun2",
                        noun2FileS3Response.value
                    );

                if (noun2FileFileSystemResponse.isFailure()) {
                    return next(noun2FileFileSystemResponse.error);
                }
            }

            const execSearchResponse =
                await FileSystemSearchService.executeSearchTriples(search);

            if (execSearchResponse.isFailure()) {
                return next(execSearchResponse.error);
            }
        }

        // After all searches have been executed, group them up in a single tsv file
        const groupSearchesResponse =
            await FileSystemSearchService.executeGroupTriples(projectId);

        if (groupSearchesResponse.isFailure()) {
            return next(groupSearchesResponse.error);
        }

        /**
         * Temporal solution to upload the raw .tsv file to s3
         */

        const uploadResultResponse =
            await S3SearchService.uploadSearchResultFile(projectId);

        if (uploadResultResponse.isFailure()) {
            return next(uploadResultResponse.error);
        }

        void FileSystemSearchService.deleteSearchesDir(projectId);

        const updateProjectResponse = await projectRepo.finishCreation(
            projectId
        );

        if (updateProjectResponse.isFailure()) {
            return next(updateProjectResponse.error);
        }

        return res.status(StatusCodes.OK).json({
            success: true,
            project: updateProjectResponse.value,
            url: uploadResultResponse.value
        });
    };

export const ProjectController = (
    projectRepo: IProjectRepository,
    searchRepo: ISearchRepository,
    S3SearchService: IS3SearchService,
    FileSystemSearchService: IFileSystemSearchService
) => ({
    findById: _findById(projectRepo),
    updateDetails: _updateDetails(projectRepo),
    handleCorpusUpload: _handleCorpusUpload(projectRepo),
    runSearches: _runSearches(
        searchRepo,
        projectRepo,
        S3SearchService,
        FileSystemSearchService
    )
});
