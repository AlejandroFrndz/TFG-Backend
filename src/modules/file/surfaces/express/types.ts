import { CreateFileParams } from "#file/domain";
import { Request } from "express";

export type ExpressCreateFileRequest = Request<
    {},
    {},
    Omit<CreateFileParams, "owner">
>;
