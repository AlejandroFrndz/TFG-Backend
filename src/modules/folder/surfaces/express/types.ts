import { CreateFolderParams } from "#folder/domain";
import { Request } from "express";

export type ExpressCreateFolderRequest = Request<{}, {}, CreateFolderParams>;
