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

export type AccuracyResponse = FailureOrSuccess<
    NotFoundError | UnexpectedError,
    { relevant: number; total: number; percentage: number }
>;

export type UpdateTripleRequest = Pick<
    Triple,
    "noun1" | "verb" | "noun2" | "problem" | "id"
>;

export interface ITripleRepository {
    createMultiple(
        fileTriples: FileDomainTriple[],
        projectId: string
    ): Promise<TriplesResponse>;
    getAllForProject(projectId: string): Promise<TriplesResponse>;
    update(request: UpdateTripleRequest): Promise<TripleResponse>;
    getAccuracyForProject(projectId: string): Promise<AccuracyResponse>;
}
