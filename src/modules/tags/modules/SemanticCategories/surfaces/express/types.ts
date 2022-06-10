import { Request } from "express";

export type ExpressCreateSemanticCategoryTagRequest = Request<
    {},
    {},
    { tag: string; ancestor: string | null }
>;
