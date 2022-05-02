import { Request } from "express";

export type ExpressGetProjectRequest = Request<{ projectId: string }>;
