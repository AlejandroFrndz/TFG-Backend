import { FailureOrSuccess } from "src/core/logic";
import {
    NotFoundError,
    PrimaryKeyConstraintError,
    UnexpectedError
} from "src/core/logic/errors";
import { SemanticCategoryTag } from "./SemanticCategoryTag";

export type SemanticCategoryTagResponse = FailureOrSuccess<
    UnexpectedError | NotFoundError | PrimaryKeyConstraintError,
    SemanticCategoryTag
>;

export interface ISemanticCategoryTagRepository {
    create(
        tag: Omit<SemanticCategoryTag, "subTags">
    ): Promise<SemanticCategoryTagResponse>;
}
