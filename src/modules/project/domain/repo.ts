import { FailureOrSuccess } from "src/core/logic";
import { NotFoundError, UnexpectedError } from "src/core/logic/errors";
import { Project } from "./Project";

export type ProjectResponse = FailureOrSuccess<
    NotFoundError | UnexpectedError,
    Project
>;

export interface IProjectRepository {
    findById(id: string): Promise<ProjectResponse>;
}
