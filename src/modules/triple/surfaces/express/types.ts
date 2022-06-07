import { Request } from "express";

export type ExpressGetAllForProjectRequest = Request<{ projectId: string }>;
