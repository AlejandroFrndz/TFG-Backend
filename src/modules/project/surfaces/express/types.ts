import { ProjectDetails } from "#project/domain/repo";
import { Request } from "express";

export type ExpressGetProjectRequest = Request<{ projectId: string }>;

export type ExpressUpdateProjectDetailsRequest = Request<
    { projectId: string },
    ProjectDetails
>;

export type ExpressUploadCorpusRequest = Request<{ projectId: string }>;
