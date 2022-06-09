import { FailureOrSuccess } from "src/core/logic";
import { NotFoundError, UnexpectedError } from "src/core/logic/errors";
import { PrimaryKeyConstraintError } from "src/core/logic/errors/PrimaryKeyConstraintError";
import { LexicalDomainTag } from "./LexicalDomain";

export type LexicalDomainTagResponse = FailureOrSuccess<
    UnexpectedError | NotFoundError | PrimaryKeyConstraintError,
    LexicalDomainTag
>;

export interface ILexicalDomainTagRepository {
    create(tag: LexicalDomainTag): Promise<LexicalDomainTagResponse>;
}
