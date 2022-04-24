import { CreateFileParams } from "#file/domain";
import { Request } from "express";

export type ExpressCreateFileRequest = Request<
    {},
    {},
    Omit<CreateFileParams, "owner">
>;

export type ExpressUpdateParentRequest = Request<
    { fileId: string },
    {},
    { parentId: string | null }
>;

export type ExpressRenameFileRequest = Request<
    { fileId: string },
    {},
    { name: string }
>;

export type ExpressDeleteFileRequest = Request<{ fileId: string }>;
