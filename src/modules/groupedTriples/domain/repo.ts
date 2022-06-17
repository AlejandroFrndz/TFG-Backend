import { EmptyResponse, FailureOrSuccess } from "src/core/logic";
import { NotFoundError, UnexpectedError } from "src/core/logic/errors";
import { GroupedTriples } from "./GroupedTriples";

export type GroupedTriplesResponse = FailureOrSuccess<
    NotFoundError | UnexpectedError,
    GroupedTriples
>;

export type GroupedTriplesArrayResponse = FailureOrSuccess<
    NotFoundError | UnexpectedError,
    GroupedTriples[]
>;

export interface IGroupedTriplesRepository {
    create(params: GroupedTriples): Promise<GroupedTriplesResponse>;
    getAllForProject(projectId: string): Promise<GroupedTriplesArrayResponse>;
    removeAllForProject(projectId: string): Promise<EmptyResponse>;
}
