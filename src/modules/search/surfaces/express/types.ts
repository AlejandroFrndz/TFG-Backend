import { CreateSearchParams } from "#search/domain";
import { Request } from "express";

export type ExpressCreateSearchRequest = Request<{}, CreateSearchParams>;
