import { BadRequestError } from "./BadRequestError";
import { ForbiddenError } from "./ForbiddenError";
import { NotFoundError } from "./NotFoundError";
import { UnauthorizedError } from "./UnauthorizedError";
import { UnexpectedError } from "./UnexpectedError";

export {
    BadRequestError,
    ForbiddenError,
    NotFoundError,
    UnauthorizedError,
    UnexpectedError
};

export type AnyError =
    | NotFoundError
    | UnexpectedError
    | ForbiddenError
    | BadRequestError
    | UnauthorizedError;
