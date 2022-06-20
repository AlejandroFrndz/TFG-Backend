import { EmptyResponse, FailureOrSuccess } from "src/core/logic";
import {
    NotFoundError,
    PrimaryKeyConstraintError,
    UnexpectedError
} from "src/core/logic/errors";
import { ErrorTag } from "./ErrorTag";

export type ErrorTagResponse = FailureOrSuccess<
    UnexpectedError | NotFoundError | PrimaryKeyConstraintError,
    ErrorTag
>;

export type ErrorTagsResponse = FailureOrSuccess<
    UnexpectedError | NotFoundError | PrimaryKeyConstraintError,
    ErrorTag[]
>;

export interface IErrorTagRepository {
    create(tag: ErrorTag): Promise<ErrorTagResponse>;
    findAll(): Promise<ErrorTagsResponse>;
    delete(errorCode: number): Promise<EmptyResponse>;
}
