import {
    CreateFileParams,
    File,
    FileResponse,
    FilesResponse,
    IFileRepository
} from "#file/domain";
import { FolderEntity } from "#folder/infra/postgres/folder.model";
import { UserEntity } from "#user/infra/postgres/user.model";
import { Mapper } from "src/core/domain/mapper";
import { EmptyResponse, failure, success } from "src/core/logic";
import { NotFoundError, UnexpectedError } from "src/core/logic/errors";
import { Repository } from "typeorm";
import { FileEntity } from "./file.model";

export class TypeORMFileRepository implements IFileRepository {
    constructor(
        private readonly repo: Repository<FileEntity>,
        private readonly mapper: Mapper<File, FileEntity>,
        private readonly folderRepo: Repository<FolderEntity>,
        private readonly userRepo: Repository<UserEntity>
    ) {}

    async create(params: CreateFileParams): Promise<FileResponse> {
        try {
            const {
                name,
                owner: ownerId,
                parent: parentId,
                project: projectId
            } = params;

            let parent: FolderEntity | null = null;

            if (parentId) {
                parent = await this.folderRepo.findOne({
                    where: { id: parentId }
                });

                if (!parent) {
                    return failure(
                        new NotFoundError(
                            `Parent folder with id ${parentId} not found`
                        )
                    );
                }
            }

            const owner = await this.userRepo.findOne({
                where: { id: ownerId }
            });

            if (!owner) {
                return failure(
                    new NotFoundError(`Owner user with id ${ownerId} not found`)
                );
            }

            const file = this.repo.create({
                name,
                parent,
                owner,
                project: projectId
            });

            const createdFile = await this.repo.save(file);

            return success(this.mapper.toDomain(createdFile));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    async findById(id: string): Promise<FileResponse> {
        try {
            const file = await this.repo.findOne({
                where: { id },
                relations: { owner: true, parent: true }
            });

            if (!file) {
                return failure(
                    new NotFoundError(`File with id ${id} not found`)
                );
            }

            return success(this.mapper.toDomain(file));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    async findAllForUser(userId: string): Promise<FilesResponse> {
        try {
            const files = await this.repo.find({
                where: { owner: { id: userId } },
                relations: { owner: true, parent: true },
                order: {
                    name: "ASC"
                }
            });

            return success(files.map((file) => this.mapper.toDomain(file)));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    async updateParent(
        fileId: string,
        parentId: string | null
    ): Promise<FileResponse> {
        try {
            const file = await this.repo.findOne({
                where: { id: fileId },
                relations: { owner: true, parent: true }
            });

            if (!file) {
                return failure(
                    new NotFoundError(`File with id ${fileId} no found`)
                );
            }

            let parent: FolderEntity | null = null;

            if (parentId) {
                parent = await this.folderRepo.findOne({
                    where: { id: parentId }
                });

                if (!parent) {
                    return failure(
                        new NotFoundError(
                            `Parent folder with id ${parentId} not found`
                        )
                    );
                }
            }

            file.parent = parent;

            const savedFile = await this.repo.save(file);

            return success(this.mapper.toDomain(savedFile));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    async rename(fileId: string, name: string): Promise<FileResponse> {
        try {
            const file = await this.repo.findOne({
                where: { id: fileId },
                relations: { owner: true, parent: true }
            });

            if (!file) {
                return failure(
                    new NotFoundError(`File with id ${fileId} no found`)
                );
            }

            file.name = name;

            const savedFile = await this.repo.save(file);

            return success(this.mapper.toDomain(savedFile));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    async delete(fileId: string): Promise<EmptyResponse> {
        try {
            const file = await this.repo.findOne({
                where: { id: fileId },
                relations: { owner: true, parent: true }
            });

            if (!file) {
                return failure(
                    new NotFoundError(`File with id ${fileId} no found`)
                );
            }

            await this.repo.remove(file);

            return success(null);
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }
}
