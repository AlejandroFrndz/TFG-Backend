import { FailureOrSuccess } from "src/core/logic";
import { AnyErrorType } from "src/core/logic/errors";
import { IError } from "src/core/logic/errors/IError";

export const expectSuccess = (
    response: FailureOrSuccess<IError, any>,
    value: any,
    responseValueOverride?: any
) => {
    expect(response.isSuccess()).toBeTruthy();
    expect(
        responseValueOverride !== undefined
            ? responseValueOverride
            : response.value
    ).toEqual(value);
};

export const expectFailure = (
    response: FailureOrSuccess<IError, any>,
    errorType: AnyErrorType,
    errorMessage?: string
) => {
    expect(response.isFailure()).toBeTruthy();
    expect(response.error.type).toEqual(errorType);

    if (errorMessage) expect(response.error.message).toEqual(errorMessage);
};
