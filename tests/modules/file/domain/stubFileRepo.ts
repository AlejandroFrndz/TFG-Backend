import {
    CreateFileParams,
    FileResponse,
    FilesResponse,
    IFileRepository
} from "#file/domain";
import { EmptyResponse, success } from "src/core/logic";
import { FileFactory } from "./FileFactory";

export class StubFileRepository implements IFileRepository {
    async create(params: CreateFileParams): Promise<FileResponse> {
        const { parent, ...otherParams } = params;

        const file = FileFactory.create({
            ...otherParams,
            parent: parent ? parent : null
        });

        return success(file);
    }

    async findById(id: string): Promise<FileResponse> {
        const file = FileFactory.create({ id });

        return success(file);
    }

    async findAllForUser(userId: string): Promise<FilesResponse> {
        const firstFile = FileFactory.create({ owner: userId });
        const secondFile = FileFactory.create({ owner: userId });

        return success([firstFile, secondFile]);
    }

    async updateParent(
        fileId: string,
        parentId: string | null
    ): Promise<FileResponse> {
        const file = FileFactory.create({ id: fileId, parent: parentId });

        return success(file);
    }

    async rename(fileId: string, name: string): Promise<FileResponse> {
        const file = FileFactory.create({ id: fileId, name });

        return success(file);
    }

    async delete(fileId: string): Promise<EmptyResponse> {
        return success(null);
    }
}
