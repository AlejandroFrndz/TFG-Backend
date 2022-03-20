import { IError } from "./IError";

export class NotFoundError implements IError {
    public readonly type = "NotFoundError";

    constructor(readonly message: string, readonly error?: Error) {}
}
