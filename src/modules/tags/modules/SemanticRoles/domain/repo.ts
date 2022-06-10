import { FailureOrSuccess } from "src/core/logic";
import { NotFoundError, UnexpectedError } from "src/core/logic/errors";
import { PrimaryKeyConstraintError } from "src/core/logic/errors/PrimaryKeyConstraintError";
import { SemanticRoleTag } from "./SemanticRoleTag";

export type SemanticRoleTagResponse = FailureOrSuccess<
    UnexpectedError | NotFoundError | PrimaryKeyConstraintError,
    SemanticRoleTag
>;

export type SemanticRoleTagsResponse = FailureOrSuccess<
    UnexpectedError | NotFoundError | PrimaryKeyConstraintError,
    SemanticRoleTag[]
>;

export interface ISemanticRoleTagRepository {
    create(tag: SemanticRoleTag): Promise<SemanticRoleTagResponse>;
    findAll(): Promise<SemanticRoleTagsResponse>;
}
