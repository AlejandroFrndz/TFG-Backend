import { FailureOrSuccess } from "src/core/logic";
import { NotFoundError, UnexpectedError } from "src/core/logic/errors";
import { PrimaryKeyConstraintError } from "src/core/logic/errors/PrimaryKeyConstraintError";
import { LexicalDomainTag } from "./LexicalDomainTag";

export type LexicalDomainTagResponse = FailureOrSuccess<
    UnexpectedError | NotFoundError | PrimaryKeyConstraintError,
    LexicalDomainTag
>;

export type LexicalDomainTagsResponse = FailureOrSuccess<
    UnexpectedError | NotFoundError | PrimaryKeyConstraintError,
    LexicalDomainTag[]
>;

export interface ILexicalDomainTagRepository {
    create(tag: LexicalDomainTag): Promise<LexicalDomainTagResponse>;
    findAll(): Promise<LexicalDomainTagsResponse>;
}
