import { CreateFolderParams } from "#folder/domain";
import { Request } from "express";

export type ExpressCreateFolderRequest = Request<{}, {}, CreateFolderParams>;

export type ExpressUpdateParentRequest = Request<
    { folderId: string },
    {},
    { newParentId: string | null }
>;

export type ExpressRenameFolderRequest = Request<
    { folderId: string },
    {},
    { name: string }
>;
