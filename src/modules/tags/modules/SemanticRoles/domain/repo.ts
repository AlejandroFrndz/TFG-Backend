import { FailureOrSuccess } from "src/core/logic";
import { NotFoundError, UnexpectedError } from "src/core/logic/errors";
import { PrimaryKeyConstraintError } from "src/core/logic/errors/PrimaryKeyConstraintError";
import { SemanticRolTag } from "./SemanticRoleTag";

export type SemanticRoleTagResponse = FailureOrSuccess<
    UnexpectedError | NotFoundError | PrimaryKeyConstraintError,
    SemanticRolTag
>;

export interface ISemanticRoleTagRepository {
    create(tag: SemanticRolTag): Promise<SemanticRoleTagResponse>;
}
