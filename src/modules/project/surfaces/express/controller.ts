import { IGroupedTriplesRepository } from "#groupedTriples/domain";
import { IFileSystemGroupedTriplesService } from "#groupedTriples/services/FileSystem";
import { Language } from "#project/domain";
import { IProjectRepository } from "#project/domain/repo";
import { IS3ProjectService } from "#project/services/AWS/S3";
import { IFileSystemProjectService } from "#project/services/FileSystem";
import { ISearchRepository } from "#search/domain";
import { IS3SearchService } from "#search/services/AWS/S3";
import { IFileSystemSearchService } from "#search/services/FileSystem";
import { ITripleRepository } from "#triple/domain/repo";
import { IFileSystemTripleService } from "#triple/services/FileSystem";
import { User } from "#user/domain";
import { NextFunction, Response, Request } from "express";
import { StatusCodes } from "http-status-codes";
import { ForbiddenError } from "src/core/logic/errors";
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

        const updatedProjectResponse = await projectRepo.finishPhase(projectId);

        if (updatedProjectResponse.isFailure()) {
            return next(updatedProjectResponse.error);
        }

        res.status(StatusCodes.ACCEPTED).json({
            success: true,
            project: updatedProjectResponse.value
        });

        const writeCorpusResponse =
            await fileSystemProjectService.writeCorpusFiles(
                files,
                userId,
                projectId
            );

        if (writeCorpusResponse.isFailure()) {
            console.log(writeCorpusResponse.error);
            return;
        }

        const parseAndIndexResponse =
            await fileSystemProjectService.executeParseAndIndex(
                project.language as Language,
                userId,
                project.id
            );

        if (parseAndIndexResponse.isFailure()) {
            console.log(parseAndIndexResponse.error);
            return;
        }

        const s3UploadResponse = await s3ProjectService.uploadProcessedCorpus(
            userId,
            project.id
        );

        if (s3UploadResponse.isFailure()) {
            console.log(s3UploadResponse.error);
            return;
        }

        const updatedProjectResponse2 = await projectRepo.finishPhase(
            project.id
        );

        if (updatedProjectResponse2.isFailure()) {
            console.log(updatedProjectResponse2.error);
            return;
        }

        await fileSystemProjectService.deleteProcessedCorpusDir(userId);
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

        const updatedProjectResponse = await projectRepo.finishPhase(
            projectResponse.value.id
        );

        if (updatedProjectResponse.isFailure()) {
            return next(updatedProjectResponse.error);
        }

        res.status(StatusCodes.ACCEPTED).json({
            success: true,
            project: updatedProjectResponse.value
        });

        const searchesResponse = await searchRepo.getAllForProject(projectId);

        if (searchesResponse.isFailure()) {
            console.log(searchesResponse.error);
            return;
        }

        const project = projectResponse.value;
        const searches = searchesResponse.value;

        const corpusResponse = await s3SearchService.getProcessedCorpus({
            userId: project.owner,
            projectId: project.id
        });

        if (corpusResponse.isFailure()) {
            console.log(corpusResponse.error);
            return;
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
                    console.log(noun1FileS3Response.error);
                    return;
                }

                const noun1FileFileSystemResponse =
                    await fileSystemSearchService.writeParameterFile(
                        project.id,
                        search.id,
                        "noun1",
                        noun1FileS3Response.value
                    );

                if (noun1FileFileSystemResponse.isFailure()) {
                    console.log(noun1FileFileSystemResponse.error);
                    return;
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
                    console.log(verbFileS3Response.error);
                    return;
                }

                const verbFileFileSystemResponse =
                    await fileSystemSearchService.writeParameterFile(
                        project.id,
                        search.id,
                        "verb",
                        verbFileS3Response.value
                    );

                if (verbFileFileSystemResponse.isFailure()) {
                    console.log(verbFileFileSystemResponse.error);
                    return;
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
                    console.log(noun2FileS3Response.error);
                    return;
                }

                const noun2FileFileSystemResponse =
                    await fileSystemSearchService.writeParameterFile(
                        project.id,
                        search.id,
                        "noun2",
                        noun2FileS3Response.value
                    );

                if (noun2FileFileSystemResponse.isFailure()) {
                    console.log(noun2FileFileSystemResponse.error);
                    return;
                }
            }

            const execSearchResponse =
                await fileSystemSearchService.executeSearchTriples(search);

            if (execSearchResponse.isFailure()) {
                console.log(execSearchResponse.error);
                return;
            }
        }

        // After all searches have been executed, group them up in a single tsv file
        const groupSearchesResponse =
            await fileSystemSearchService.executeGroupTriples(projectId);

        if (groupSearchesResponse.isFailure()) {
            void fileSystemSearchService.deleteSearchesDir(projectId);
            console.log(groupSearchesResponse.error);
            return;
        }

        // Read .tsv file
        const parseResultsResponse =
            await fileSystemSearchService.parseResultsFile(projectId);

        if (parseResultsResponse.isFailure()) {
            void fileSystemSearchService.deleteSearchesDir(projectId);
            console.log(parseResultsResponse.error);
            return;
        }

        const saveTriplesResponse = await tripleRepo.createMultiple(
            parseResultsResponse.value,
            projectId
        );

        if (saveTriplesResponse.isFailure()) {
            void fileSystemSearchService.deleteSearchesDir(projectId);
            console.log(saveTriplesResponse.error);
            return;
        }

        void fileSystemSearchService.deleteSearchesDir(projectId);

        const updatedProjectResponse2 = await projectRepo.finishPhase(
            projectId
        );

        if (updatedProjectResponse2.isFailure()) {
            console.log(updatedProjectResponse2.error);
            return;
        }
    };

const _finishTagging =
    (
        projectRepo: IProjectRepository,
        tripleRepo: ITripleRepository,
        fileSystemProjectService: IFileSystemProjectService,
        fileSystemTripleService: IFileSystemTripleService,
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

        const updatedProjectResponse = await projectRepo.finishPhase(
            project.id
        );

        if (updatedProjectResponse.isFailure()) {
            return next(updatedProjectResponse.error);
        }

        res.status(StatusCodes.ACCEPTED).json({
            success: true,
            project: updatedProjectResponse.value
        });

        const triplesResponse = await tripleRepo.getAllForProject(projectId);

        if (triplesResponse.isFailure()) {
            console.log(triplesResponse.error);
            return;
        }

        const triples = triplesResponse.value;

        const writeTriplesResponse =
            await fileSystemTripleService.writeTriplesToFile(
                projectId,
                triples
            );

        if (writeTriplesResponse.isFailure()) {
            console.log(writeTriplesResponse.error);
            return;
        }

        const executeGroupFramesResponse =
            await fileSystemProjectService.executeGroupFrames(projectId);

        if (executeGroupFramesResponse.isFailure()) {
            console.log(executeGroupFramesResponse.error);
            return;
        }

        const fileGroupedTriplesResponse =
            await fileSystemGroupedTriplesService.parseGroupedTriplesFile(
                projectId
            );

        if (fileGroupedTriplesResponse.isFailure()) {
            console.log(fileGroupedTriplesResponse.error);
            return;
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
            return;
        }

        const finishTaggingResponse = await projectRepo.finishPhase(projectId);

        if (finishTaggingResponse.isFailure()) {
            await groupedTriplesRepo.removeAllForProject(projectId);
            console.log(finishTaggingResponse.error);
            return;
        }

        await fileSystemGroupedTriplesService.deleteGroupedTriplesDir(
            projectId
        );
    };

const _findFinishedForUser =
    (projectRepo: IProjectRepository) =>
    async (req: Request, res: Response, next: NextFunction) => {
        const user = req.user as User;

        const projectsResponse = await projectRepo.findFinishedForUser(user.id);

        if (projectsResponse.isFailure()) {
            return next(projectsResponse.error);
        }

        return res
            .status(StatusCodes.OK)
            .json({ success: true, projects: projectsResponse.value });
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
        groupedTriplesRepo,
        fileSystemGroupedTriplesService
    ),
    findFinishedForUser: _findFinishedForUser(projectRepo)
});
