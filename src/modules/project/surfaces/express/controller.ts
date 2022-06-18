import { IGroupedTriplesRepository } from "#groupedTriples/domain";
import { IFileSystemGroupedTriplesService } from "#groupedTriples/services/FileSystem";
import { Language, ProjectPhase } from "#project/domain";
import { IProjectRepository } from "#project/domain/repo";
import { IS3ProjectService } from "#project/services/AWS/S3";
import { IFileSystemProjectService } from "#project/services/FileSystem";
import { ISearchRepository } from "#search/domain";
import { IS3SearchService } from "#search/services/AWS/S3";
import { IFileSystemSearchService } from "#search/services/FileSystem";
import { ITripleRepository } from "#triple/domain/repo";
import { ITripleFileMapper } from "#triple/infra/mapper";
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
    ExpressFinishTaggingRequest,
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
    (
        projectRepo: IProjectRepository,
        s3ProjectService: IS3ProjectService,
        fileSystemProjectService: IFileSystemProjectService
    ) =>
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
            await fileSystemProjectService.writeCorpusFiles(
                files,
                userId,
                projectId
            );

        if (writeCorpusResponse.isFailure()) {
            return next(writeCorpusResponse.error);
        }

        const parseAndIndexResponse =
            await fileSystemProjectService.executeParseAndIndex(
                project.language as Language,
                userId,
                project.id
            );

        if (parseAndIndexResponse.isFailure()) {
            return next(parseAndIndexResponse.error);
        }

        const s3UploadResponse = await s3ProjectService.uploadProcessedCorpus(
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

        await fileSystemProjectService.deleteProcessedCorpusDir(userId);

        res.status(StatusCodes.OK).json({
            success: true,
            project: updateProjectResponse.value
        });
    };

const _runSearches =
    (
        searchRepo: ISearchRepository,
        projectRepo: IProjectRepository,
        s3SearchService: IS3SearchService,
        fileSystemSearchService: IFileSystemSearchService,
        tripleRepo: ITripleRepository
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

        const corpusResponse = await s3SearchService.getProcessedCorpus({
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
                    await s3SearchService.getParameterFile(
                        search.id,
                        "noun1",
                        noun1.value
                    );

                if (noun1FileS3Response.isFailure()) {
                    return next(noun1FileS3Response.error);
                }

                const noun1FileFileSystemResponse =
                    await fileSystemSearchService.writeParameterFile(
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
                    await s3SearchService.getParameterFile(
                        search.id,
                        "verb",
                        verb.value
                    );

                if (verbFileS3Response.isFailure()) {
                    return next(verbFileS3Response.error);
                }

                const verbFileFileSystemResponse =
                    await fileSystemSearchService.writeParameterFile(
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
                    await s3SearchService.getParameterFile(
                        search.id,
                        "noun2",
                        noun2.value
                    );

                if (noun2FileS3Response.isFailure()) {
                    return next(noun2FileS3Response.error);
                }

                const noun2FileFileSystemResponse =
                    await fileSystemSearchService.writeParameterFile(
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
                await fileSystemSearchService.executeSearchTriples(search);

            if (execSearchResponse.isFailure()) {
                return next(execSearchResponse.error);
            }
        }

        // After all searches have been executed, group them up in a single tsv file
        const groupSearchesResponse =
            await fileSystemSearchService.executeGroupTriples(projectId);

        if (groupSearchesResponse.isFailure()) {
            void fileSystemSearchService.deleteSearchesDir(projectId);
            return next(groupSearchesResponse.error);
        }

        // Read .tsv file
        const parseResultsResponse =
            await fileSystemSearchService.parseResultsFile(projectId);

        if (parseResultsResponse.isFailure()) {
            void fileSystemSearchService.deleteSearchesDir(projectId);
            return next(parseResultsResponse.error);
        }

        if (parseResultsResponse.value.length === 0) {
            void fileSystemSearchService.deleteSearchesDir(projectId);
            return next(new BadRequestError("Empty result files"));
        }

        const saveTriplesResponse = await tripleRepo.createMultiple(
            parseResultsResponse.value,
            projectId
        );

        if (saveTriplesResponse.isFailure()) {
            void fileSystemSearchService.deleteSearchesDir(projectId);
            return next(saveTriplesResponse.error);
        }

        void fileSystemSearchService.deleteSearchesDir(projectId);

        const updateProjectResponse = await projectRepo.finishAnalysis(
            projectId
        );

        if (updateProjectResponse.isFailure()) {
            return next(updateProjectResponse.error);
        }

        return res.status(StatusCodes.OK).json({
            success: true,
            project: updateProjectResponse.value
        });
    };

const _finishTagging =
    (
        projectRepo: IProjectRepository,
        tripleRepo: ITripleRepository,
        fileSystemProjectService: IFileSystemProjectService,
        fileSystemTripleService: IFileSystemTripleService,
        tripleFileMapper: ITripleFileMapper,
        groupedTriplesRepo: IGroupedTriplesRepository,
        fileSystemGroupedTriplesService: IFileSystemGroupedTriplesService
    ) =>
    async (
        req: ExpressFinishTaggingRequest,
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
                    "You cannot edit a project that does not belong to you"
                )
            );
        }

        const triplesResponse = await tripleRepo.getAllForProject(projectId);

        if (triplesResponse.isFailure()) {
            return next(triplesResponse.error);
        }

        const triples = triplesResponse.value;

        const writeTriplesResponse =
            await fileSystemTripleService.writeTriplesToFile(
                projectId,
                triples
            );

        if (writeTriplesResponse.isFailure()) {
            return next(writeTriplesResponse.error);
        }

        const executeGroupFramesResponse =
            await fileSystemProjectService.executeGroupFrames(projectId);

        if (executeGroupFramesResponse.isFailure()) {
            return next(executeGroupFramesResponse.error);
        }

        const fileGroupedTriplesResponse =
            await fileSystemGroupedTriplesService.parseGroupedTriplesFile(
                projectId
            );

        if (fileGroupedTriplesResponse.isFailure()) {
            return next(fileGroupedTriplesResponse.error);
        }

        const groupedTriplesPromises = fileGroupedTriplesResponse.value.map(
            (groupedTriples) => groupedTriplesRepo.create(groupedTriples)
        );

        const groupedTriplesResponses = await Promise.all(
            groupedTriplesPromises
        );

        if (
            groupedTriplesResponses.some((groupedTriplesResponse) =>
                groupedTriplesResponse.isFailure()
            )
        ) {
            // Remove created triples (in case one or more were successful)
            await groupedTriplesRepo.removeAllForProject(projectId);
            return next(new UnexpectedError());
        }

        const finishTaggingResponse = await projectRepo.finishPhase(
            projectId,
            ProjectPhase.Tagging
        );

        if (finishTaggingResponse.isFailure()) {
            await groupedTriplesRepo.removeAllForProject(projectId);
            return next(finishTaggingResponse.error);
        }

        await fileSystemGroupedTriplesService.deleteGroupedTriplesDir(
            projectId
        );

        return res
            .status(StatusCodes.OK)
            .json({ success: true, project: finishTaggingResponse.value });
    };

export const ProjectController = (
    projectRepo: IProjectRepository,
    searchRepo: ISearchRepository,
    s3SearchService: IS3SearchService,
    fileSystemSearchService: IFileSystemSearchService,
    s3ProjectService: IS3ProjectService,
    fileSystemProjectService: IFileSystemProjectService,
    tripleRepo: ITripleRepository,
    fileSystemTripleService: IFileSystemTripleService,
    tripleFileMapper: ITripleFileMapper,
    groupedTriplesRepo: IGroupedTriplesRepository,
    fileSystemGroupedTriplesService: IFileSystemGroupedTriplesService
) => ({
    findById: _findById(projectRepo),
    updateDetails: _updateDetails(projectRepo),
    handleCorpusUpload: _handleCorpusUpload(
        projectRepo,
        s3ProjectService,
        fileSystemProjectService
    ),
    runSearches: _runSearches(
        searchRepo,
        projectRepo,
        s3SearchService,
        fileSystemSearchService,
        tripleRepo
    ),
    finishTagging: _finishTagging(
        projectRepo,
        tripleRepo,
        fileSystemProjectService,
        fileSystemTripleService,
        tripleFileMapper,
        groupedTriplesRepo,
        fileSystemGroupedTriplesService
    )
});
