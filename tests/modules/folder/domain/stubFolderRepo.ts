import {
    CreateFolderParams,
    FolderResponse,
    FoldersResponse,
    IFolderRepository
} from "#folder/domain";
import { EmptyResponse, success } from "src/core/logic";
import { FolderFactory } from "./FolderFactory";

export class StubFolderRepository implements IFolderRepository {
    async create(
        params: CreateFolderParams & { owner: string }
    ): Promise<FolderResponse> {
        const { parent, ...otherParams } = params;

        const folder = FolderFactory.create({
            ...otherParams,
            parent: parent ? parent : null
        });

        return success(folder);
    }

    async findById(id: string): Promise<FolderResponse> {
        const folder = FolderFactory.create({ id });

        return success(folder);
    }

    async findAllForUser(userId: string): Promise<FoldersResponse> {
        const firstFolder = FolderFactory.create({ owner: userId });
        const secondFolder = FolderFactory.create({ owner: userId });

        return success(
            [firstFolder, secondFolder].sort((a, b) =>
                a.name.localeCompare(b.name)
            )
        );
    }

    async updateParent(
        childId: string,
        newParentId: string | null
    ): Promise<FolderResponse> {
        const folder = FolderFactory.create({
            id: childId,
            parent: newParentId
        });

        return success(folder);
    }

    async rename(folderId: string, name: string): Promise<FolderResponse> {
        const folder = FolderFactory.create({ id: folderId, name });

        return success(folder);
    }

    async delete(folderId: string): Promise<EmptyResponse> {
        return success(null);
    }
}
