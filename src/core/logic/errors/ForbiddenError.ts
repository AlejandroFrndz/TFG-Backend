import { IError } from "./IError";

export class ForbiddenError implements IError {
    public readonly type = "ForbiddenError";

    constructor(readonly message: string, readonly error?: any) {}
}
