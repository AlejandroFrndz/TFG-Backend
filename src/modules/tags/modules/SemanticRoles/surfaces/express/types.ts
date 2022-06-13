import { Request } from "express";

export type ExpressCreateSemanticRoleTagRequest = Request<
    {},
    {},
    { tag: string; definition?: string }
>;
export type ExpressDeleteSemanticRoleTagRequest = Request<{ tagName: string }>;
