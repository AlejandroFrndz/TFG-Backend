import { IError } from "./IError";

export class PrimaryKeyConstraintError implements IError {
    public readonly type = "PrimaryKeyConstraintError";
    public readonly message;

    constructor(primaryKey: string, readonly error?: any) {
        this.message = `Entity with primary key ${primaryKey} already exists`;
    }
}
