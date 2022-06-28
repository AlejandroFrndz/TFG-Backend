import { FailureOrSuccess } from "src/core/logic";
import { NotFoundError, UnexpectedError } from "src/core/logic/errors";
import { Language, Project, ProjectPhase } from "./Project";

export type ProjectResponse = FailureOrSuccess<
    NotFoundError | UnexpectedError,
    Project
>;

export type ProjectDetails = {
    domainName: string;
    isUsingSubdomains: boolean;
    language: Language;
};

export interface IProjectRepository {
    findById(id: string): Promise<ProjectResponse>;
    updateDetails(
        id: string,
        projectDetails: ProjectDetails
    ): Promise<ProjectResponse>;
    finishPhase(id: string): Promise<ProjectResponse>;
}
