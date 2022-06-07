import { FailureOrSuccess } from "src/core/logic";
import { NotFoundError, UnexpectedError } from "src/core/logic/errors";
import { FileDomainTriple, Triple } from "./Triple";

export type TriplesResponse = FailureOrSuccess<
    NotFoundError | UnexpectedError,
    Triple[]
>;

export interface ITripleRepository {
    createMultiple(
        fileTriples: FileDomainTriple[],
        projectId: string
    ): Promise<TriplesResponse>;
    getAllForProject(projectId: string): Promise<TriplesResponse>;
}
