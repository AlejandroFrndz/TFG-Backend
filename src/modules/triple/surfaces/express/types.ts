import { Triple, TriplesFileFormat } from "#triple/domain";
import { Request } from "express";

type UpdateTagsRequest = Pick<
    Triple,
    "noun1" | "verb" | "noun2" | "problem" | "id" | "project"
>;

export type ExpressGetAllForProjectRequest = Request<{ projectId: string }>;
export type ExpressUpdateTagsRequest = Request<{}, {}, UpdateTagsRequest>;
export type ExpressDownloadTriplesFileRequest = Request<
    { projectId: string },
    {},
    {},
    { fileFormat: TriplesFileFormat }
>;
