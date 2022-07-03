import { SearchParameterType } from "#search/domain";
import { Request } from "express";

type CreateSearchRequestParameter = {
    type: SearchParameterType;
    value: string | null;
};

export type CreateSearchBody = {
    noun1: CreateSearchRequestParameter;
    verb: CreateSearchRequestParameter;
    noun2: CreateSearchRequestParameter;
    isUsingSynt: boolean;
    project: string;
    description: string | null;
};

type CreateSearchRequest = {
    document: string;
};

export type ExpressCreateSearchRequest = Request<{}, {}, CreateSearchRequest>;
export type ExpressDeleteSearchRequest = Request<{ searchId: string }>;
export type ExpressGetAllForProjectRequest = Request<{ projectId: string }>;
