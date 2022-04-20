import {
    CreateFolderParams,
    Folder,
    FolderResponse,
    FoldersResponse,
    IFolderRepository
} from "#folder/domain";
import { UserEntity } from "#user/infra/postgres/user.model";
import { Mapper } from "src/core/domain/mapper";
import { failure, success, EmptyResponse } from "src/core/logic";
import { NotFoundError, UnexpectedError } from "src/core/logic/errors";
import { Repository } from "typeorm";
import { FolderEntity } from "./folder.model";

export class TypeORMFolderRepository implements IFolderRepository {
    constructor(
        private readonly repo: Repository<FolderEntity>,
        private readonly mapper: Mapper<Folder, FolderEntity>,
        private readonly userRepo: Repository<UserEntity>
    ) {}

    async create(
        params: CreateFolderParams & { owner: string }
    ): Promise<FolderResponse> {
        try {
            const { parent: parentId, owner: ownerId, name } = params;

            let parent: FolderEntity | null = null;

            if (parentId) {
                parent = await this.repo.findOne({ where: { id: parentId } });

                if (!parent) {
                    return failure(
                        new NotFoundError(
                            `Parent folder with id ${parentId} not found`
                        )
                    );
                }
            }

            const owner = await this.userRepo.findOne({
                where: { id: params.owner }
            });

            if (!owner) {
                return failure(
                    new NotFoundError(`Owner user with id ${ownerId} not found`)
                );
            }

            const folder = this.repo.create({ name, parent, owner });

            const createdFolder = await this.repo.save(folder);

            return success(this.mapper.toDomain(createdFolder));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    async findById(id: string): Promise<FolderResponse> {
        try {
            const folder = await this.repo.findOne({
                where: { id },
                relations: { parent: true, owner: true }
            });

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
            const owner = await this.userRepo.findOne({
                where: { id: userId }
            });

            if (!owner) {
                return failure(
                    new NotFoundError(`Owner user with id ${userId} not found`)
                );
            }

            const folders = await this.repo.find({
                where: { owner: { id: owner.id } },
                relations: { parent: true, owner: true }
            });

            return success(
                folders.map((folder) => this.mapper.toDomain(folder))
            );
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    async updateParent(
        childId: string,
        newParentId: string | null
    ): Promise<FolderResponse> {
        try {
            const child = await this.repo.findOne({
                where: { id: childId },
                relations: { parent: true, owner: true }
            });

            if (!child) {
                return failure(
                    new NotFoundError(
                        `Child folder with id ${childId} not found`
                    )
                );
            }

            let newParent: FolderEntity | null = null;

            if (newParentId) {
                newParent = await this.repo.findOne({
                    where: { id: newParentId },
                    relations: { parent: true, owner: true }
                });

                if (!newParent) {
                    return failure(
                        new NotFoundError(
                            `Parent folder with id ${newParentId} not found`
                        )
                    );
                }
            }

            child.parent = newParent;

            const savedChild = await this.repo.save(child);

            return success(this.mapper.toDomain(savedChild));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    async rename(folderId: string, name: string): Promise<FolderResponse> {
        try {
            const folder = await this.repo.findOne({
                where: { id: folderId },
                relations: { parent: true, owner: true }
            });

            if (!folder) {
                return failure(
                    new NotFoundError(`Folder with id ${folderId} not found`)
                );
            }

            folder.name = name;

            const savedFolder = await this.repo.save(folder);

            return success(this.mapper.toDomain(savedFolder));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    async delete(folderId: string): Promise<EmptyResponse> {
        try {
            const folder = await this.repo.findOne({ where: { id: folderId } });

            if (!folder) {
                return failure(
                    new NotFoundError(`Folder with id ${folderId} not found`)
                );
            }

            const deletedFolder = await this.repo.remove(folder);

            return success(null);
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }
}
