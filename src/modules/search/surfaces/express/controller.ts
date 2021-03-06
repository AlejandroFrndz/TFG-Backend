import { IProjectRepository } from "#project/domain/repo";
import { ISearchRepository } from "#search/domain";
import { IS3SearchService } from "#search/services/AWS/S3";
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
    ExpressGetAllForProjectRequest
} from "./types";

const _create =
    (
        searchRepo: ISearchRepository,
        projectRepo: IProjectRepository,
        s3SearchService: IS3SearchService
    ) =>
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
            isUsingSynt,
            description
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
            project: projectId,
            description
        });

        if (searchResponse.isFailure()) {
            return next(searchResponse.error);
        }

        const search = searchResponse.value;

        const promises: Promise<EmptyResponse>[] = [];

        if (noun1.type === "file" && noun1File) {
            promises.push(
                s3SearchService.uploadParameterFile(
                    search.id,
                    "noun1",
                    noun1File
                )
            );
        }

        if (verb.type === "file" && verbFile) {
            promises.push(
                s3SearchService.uploadParameterFile(search.id, "verb", verbFile)
            );
        }

        if (noun2.type === "file" && noun2File) {
            promises.push(
                s3SearchService.uploadParameterFile(
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

export const SearchController = (
    searchRepo: ISearchRepository,
    projectRepo: IProjectRepository,
    s3SearchService: IS3SearchService
) => ({
    create: _create(searchRepo, projectRepo, s3SearchService),
    delete: _delete(searchRepo, projectRepo),
    getAllForProject: _getAllForProject(searchRepo, projectRepo)
});
