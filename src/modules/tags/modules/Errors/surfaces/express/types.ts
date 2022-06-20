import { Request } from "express";

export type ExpressCreateErrorTagRequest = Request<
    {},
    {},
    { errorCode: number; humanReadable: string }
>;
export type ExpressDeleteErrorTagRequest = Request<{ errorCode: string }>;
