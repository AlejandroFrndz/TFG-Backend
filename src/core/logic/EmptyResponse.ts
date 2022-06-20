import { BadRequestError, NotFoundError, UnexpectedError } from "./errors";
import { FailureOrSuccess } from "./FailureOrSuccess";

export type EmptyResponse = FailureOrSuccess<
    NotFoundError | UnexpectedError | BadRequestError,
    null
>;
