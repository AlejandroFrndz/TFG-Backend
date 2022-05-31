import { SearchParameterType } from "#search/domain";
import { Request } from "express";

type CreateSearchRequestParameter = {
    type: SearchParameterType;
    value: string | null;
};

type CreateSearchRequestBody = {
    noun1: CreateSearchRequestParameter;
    verb: CreateSearchRequestParameter;
    noun2: CreateSearchRequestParameter;
    isUsingSynt: boolean;
    project: string;
};

export type ExpressCreateSearchRequest = Request<
    {},
    {},
    CreateSearchRequestBody
>;
