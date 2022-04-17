import { FailureOrSuccess } from "src/core/logic";
import { NotFoundError, UnexpectedError } from "src/core/logic/errors";
import { Folder } from "./Folder";

export type FolderResponse = FailureOrSuccess<
    NotFoundError | UnexpectedError,
    Folder
>;

export type FoldersResponse = FailureOrSuccess<
    NotFoundError | UnexpectedError,
    Folder[]
>;

export type CreateFolderParams = {
    name: string;
    parent?: string;
};

export interface IFolderRepository {
    create(
        params: CreateFolderParams & { owner: string }
    ): Promise<FolderResponse>;
    findById(id: string): Promise<FolderResponse>;
    findAllForUser(userId: string): Promise<FoldersResponse>;
    updateParent(childId: string, newParentId: string): Promise<FolderResponse>;
}
