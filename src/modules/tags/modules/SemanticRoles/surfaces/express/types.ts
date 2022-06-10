import { Request } from "express";

export type ExpressCreateSemanticRoleTagRequest = Request<
    {},
    {},
    { tag: string; definition?: string }
>;
