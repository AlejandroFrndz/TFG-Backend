import { IError } from "./IError";

export class UnauthorizedError implements IError {
    public readonly type = "UnauthorizedError";

    constructor(readonly message: string, readonly error?: any) {}
}
