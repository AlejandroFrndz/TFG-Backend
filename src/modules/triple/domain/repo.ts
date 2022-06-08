import { FailureOrSuccess } from "src/core/logic";
import { NotFoundError, UnexpectedError } from "src/core/logic/errors";
import { FileDomainTriple, Triple } from "./Triple";

export type TriplesResponse = FailureOrSuccess<
    NotFoundError | UnexpectedError,
    Triple[]
>;

export type TripleResponse = FailureOrSuccess<
    NotFoundError | UnexpectedError,
    Triple
>;

export type UpdateTagsRequest = Pick<
    Triple,
    "noun1" | "verb" | "noun2" | "problem" | "id"
>;

export interface ITripleRepository {
    createMultiple(
        fileTriples: FileDomainTriple[],
        projectId: string
    ): Promise<TriplesResponse>;
    getAllForProject(projectId: string): Promise<TriplesResponse>;
    updateTags(request: UpdateTagsRequest): Promise<TripleResponse>;
}
