import { BadRequestError } from "./BadRequestError";
import { ForbiddenError } from "./ForbiddenError";
import { NotFoundError } from "./NotFoundError";
import { UnauthorizedError } from "./UnauthorizedError";
import { UnexpectedError } from "./UnexpectedError";
import { PrimaryKeyConstraintError } from "./PrimaryKeyConstraintError";

export {
    BadRequestError,
    ForbiddenError,
    NotFoundError,
    UnauthorizedError,
    UnexpectedError,
    PrimaryKeyConstraintError
};

export type AnyError =
    | NotFoundError
    | UnexpectedError
    | ForbiddenError
    | BadRequestError
    | UnauthorizedError
    | PrimaryKeyConstraintError;

export type AnyErrorType =
    | "NotFoundError"
    | "UnexpectedError"
    | "ForbiddenError"
    | "BadRequestError"
    | "UnauthorizedError"
    | "PrimaryKeyConstraintError";
