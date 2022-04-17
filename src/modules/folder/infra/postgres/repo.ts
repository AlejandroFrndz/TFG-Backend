import {
    CreateFolderParams,
    Folder,
    FolderResponse,
    FoldersResponse,
    IFolderRepository
} from "#folder/domain";
import { Mapper } from "src/core/domain/mapper";
import { failure, success } from "src/core/logic";
import { NotFoundError, UnexpectedError } from "src/core/logic/errors";
import { Repository } from "typeorm";
import { FolderEntity } from "./folder.model";

export class TypeORMFolderRepository implements IFolderRepository {
    constructor(
        private readonly repo: Repository<FolderEntity>,
        private readonly mapper: Mapper<Folder, FolderEntity>
    ) {}

    async create(
        params: CreateFolderParams & { owner: string }
    ): Promise<FolderResponse> {
        try {
            const folder = this.repo.create({ ...params });

            const createdFolder = await this.repo.save(folder);

            return success(this.mapper.toDomain(createdFolder));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    async findById(id: string): Promise<FolderResponse> {
        try {
            const folder = await this.repo.findOne({ where: { id } });

            if (!folder) {
                return failure(
                    new NotFoundError(`Folder with id ${id} not found`)
                );
            }

            return success(this.mapper.toDomain(folder));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    async findAllForUser(userId: string): Promise<FoldersResponse> {
        try {
            const folders = await this.repo.find({ where: { owner: userId } });

            return success(
                folders.map((folder) => this.mapper.toDomain(folder))
            );
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }
}
