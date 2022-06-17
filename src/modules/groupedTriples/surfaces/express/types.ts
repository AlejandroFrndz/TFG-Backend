import { GroupedTriplesFileFormat } from "#groupedTriples/domain";
import { Request } from "express";

export type ExpressDownloadGroupedTriplesFileRequest = Request<
    { projectId: string },
    {},
    {},
    { fileFormat: GroupedTriplesFileFormat }
>;
