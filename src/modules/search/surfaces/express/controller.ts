import { IProjectRepository } from "#project/domain/repo";
import { ISearchRepository } from "#search/domain";
import { S3SearchService } from "#search/services/AWS/S3";
import { FileSystemSearchService } from "#search/services/FileSystem";
import { User } from "#user/domain";
import { Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import _ from "lodash";
import { EmptyResponse } from "src/core/logic";
import { BadRequestError, ForbiddenError } from "src/core/logic/errors";
import {
    CreateSearchBody,
    ExpressCreateSearchRequest,
    ExpressDeleteSearchRequest,
    ExpressGetAllForProjectRequest,
    ExpressRunSearchesRequest
} from "./types";

const _create =
    (searchRepo: ISearchRepository, projectRepo: IProjectRepository) =>
    async (
        req: ExpressCreateSearchRequest,
        res: Response,
        next: NextFunction
    ) => {
        const parsedBody: CreateSearchBody = JSON.parse(req.body.document);

        const {
            project: projectId,
            noun1,
            verb,
            noun2,
            isUsingSynt
        } = parsedBody;

        const projectResponse = await projectRepo.findById(projectId);

        if (projectResponse.isFailure()) {
            return next(projectResponse.error);
        }

        if (projectResponse.value.owner !== (req.user as User).id) {
            return next(
                new ForbiddenError(
                    "You cannot access a project that doesn't belong to you"
                )
            );
        }

        let noun1File: Express.Multer.File | undefined;
        let verbFile: Express.Multer.File | undefined;
        let noun2File: Express.Multer.File | undefined;

        if (
            (noun1.type === "file" ||
                verb.type === "file" ||
                noun2.type === "file") &&
            _.isEmpty(req.files)
        ) {
            return next(
                new BadRequestError(
                    "Some parameter is of type file but no files were uploaded with the request"
                )
            );
        } else if (
            noun1.type === "file" ||
            verb.type === "file" ||
            noun2.type === "file"
        ) {
            const files = req.files as {
                [fieldname: string]: Express.Multer.File[];
            };

            if (noun1.type === "file") {
                noun1File = files["noun1File"][0];
            }

            if (verb.type === "file") {
                verbFile = files["verbFile"][0];
            }

            if (noun2.type === "file") {
                noun2File = files["noun2File"][0];
            }
        }
        const searchResponse = await searchRepo.create({
            noun1: {
                type: noun1.type,
                value: noun1File
                    ? noun1File.originalname
                    : (noun1.value as string)
            },
            verb: {
                type: verb.type,
                value: verbFile ? verbFile.originalname : (verb.value as string)
            },
            noun2: {
                type: noun2.type,
                value: noun2File
                    ? noun2File.originalname
                    : (noun2.value as string)
            },
            isUsingSynt,
            project: projectId
        });

        if (searchResponse.isFailure()) {
            return next(searchResponse.error);
        }

        const search = searchResponse.value;

        const promises: Promise<EmptyResponse>[] = [];

        if (noun1.type === "file" && noun1File) {
            promises.push(
                S3SearchService.uploadParameterFile(
                    search.id,
                    "noun1",
                    noun1File
                )
            );
        }

        if (verb.type === "file" && verbFile) {
            promises.push(
                S3SearchService.uploadParameterFile(search.id, "verb", verbFile)
            );
        }

        if (noun2.type === "file" && noun2File) {
            promises.push(
                S3SearchService.uploadParameterFile(
                    search.id,
                    "noun2",
                    noun2File
                )
            );
        }

        const responses = await Promise.all(promises);

        const error = responses.find((response) => response.isFailure());

        if (error) {
            await searchRepo.delete(search.id);
            return next(error.error);
        }

        return res
            .status(StatusCodes.CREATED)
            .json({ success: true, search: searchResponse.value });
    };

const _delete =
    (searchRepo: ISearchRepository, projectRepo: IProjectRepository) =>
    async (
        req: ExpressDeleteSearchRequest,
        res: Response,
        next: NextFunction
    ) => {
        const { searchId } = req.params;

        const searchResponse = await searchRepo.findById(searchId);

        if (searchResponse.isFailure()) {
            return next(searchResponse.error);
        }

        const projectResponse = await projectRepo.findById(
            searchResponse.value.project
        );

        if (projectResponse.isFailure()) {
            return next(projectResponse.error);
        }

        if (projectResponse.value.owner !== (req.user as User).id) {
            return next(
                new ForbiddenError(
                    `You cannot modify a project that does not belong to you`
                )
            );
        }

        const deleteResponse = await searchRepo.delete(searchId);

        if (deleteResponse.isFailure()) {
            return next(deleteResponse.error);
        }

        return res.sendStatus(StatusCodes.NO_CONTENT);
    };

const _getAllForProject =
    (searchRepo: ISearchRepository, projectRepo: IProjectRepository) =>
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

        const searchesResponse = await searchRepo.getAllForProject(projectId);

        if (searchesResponse.isFailure()) {
            return next(searchesResponse.error);
        }

        return res
            .status(StatusCodes.OK)
            .json({ success: true, searches: searchesResponse.value });
    };

const _runSearches =
    (searchRepo: ISearchRepository, projectRepo: IProjectRepository) =>
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
        }

        return res.status(StatusCodes.OK).json({ success: true, search: {} });
    };

export const SearchController = (
    searchRepo: ISearchRepository,
    projectRepo: IProjectRepository
) => ({
    create: _create(searchRepo, projectRepo),
    delete: _delete(searchRepo, projectRepo),
    getAllForProject: _getAllForProject(searchRepo, projectRepo),
    runSearches: _runSearches(searchRepo, projectRepo)
});
