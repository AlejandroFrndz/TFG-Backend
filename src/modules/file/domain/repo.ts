import { FailureOrSuccess } from "src/core/logic";
import { NotFoundError, UnexpectedError } from "src/core/logic/errors";
import { File } from "./File";

export type FileResponse = FailureOrSuccess<
    NotFoundError | UnexpectedError,
    File
>;

export type FilesResponse = FailureOrSuccess<
    NotFoundError | UnexpectedError,
    File[]
>;

export type CreateFileParams = {
    name: string;
    parent?: string;
    owner: string;
    project: string;
};

export interface IFileRepository {
    create(params: CreateFileParams): Promise<FileResponse>;
    findById(id: string): Promise<FileResponse>;
    findAllForUser(userId: string): Promise<FilesResponse>;
}
