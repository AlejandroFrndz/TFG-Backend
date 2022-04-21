import { IError } from "./IError";

export class BadRequestError implements IError {
    public readonly type = "BadRequestError";

    constructor(readonly message: string, readonly error?: any) {}
}
