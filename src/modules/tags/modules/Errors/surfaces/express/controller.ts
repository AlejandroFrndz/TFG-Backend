import { NextFunction, Request, response, Response } from "express";
import { StatusCodes } from "http-status-codes";
import _ from "lodash";
import { BadRequestError } from "src/core/logic/errors";
import { IErrorTagRepository } from "../../domain";
import {
    ExpressCreateErrorTagRequest,
    ExpressDeleteErrorTagRequest
} from "./types";

const _create =
    (repo: IErrorTagRepository) =>
    async (
        req: ExpressCreateErrorTagRequest,
        res: Response,
        next: NextFunction
    ) => {
        const { errorCode, humanReadable } = req.body;

        const createResponse = await repo.create({ errorCode, humanReadable });

        if (createResponse.isFailure()) {
            return next(createResponse.error);
        }

        return res
            .status(StatusCodes.CREATED)
            .json({ success: true, tag: createResponse.value });
    };

const _findAll =
    (repo: IErrorTagRepository) =>
    async (req: Request, res: Response, next: NextFunction) => {
        const response = await repo.findAll();

        if (response.isFailure()) {
            return next(response.error);
        }

        return res
            .status(StatusCodes.OK)
            .json({ success: true, tags: response.value });
    };

const _delete =
    (repo: IErrorTagRepository) =>
    async (
        req: ExpressDeleteErrorTagRequest,
        res: Response,
        next: NextFunction
    ) => {
        const { errorCode } = req.params;

        const numericErrorCode = parseInt(errorCode);

        if (_.isNaN(numericErrorCode)) {
            return next(
                new BadRequestError(
                    `${errorCode} is not a valid error code number`
                )
            );
        }

        const response = await repo.delete(numericErrorCode);

        if (response.isFailure()) {
            return next(response.error);
        }

        return res.sendStatus(StatusCodes.NO_CONTENT);
    };

export const ErrorTagController = (repo: IErrorTagRepository) => ({
    create: _create(repo),
    findAll: _findAll(repo),
    delete: _delete(repo)
});
