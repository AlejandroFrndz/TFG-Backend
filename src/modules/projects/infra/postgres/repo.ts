import { Project } from "#projects/domain";
import { IProjectRepository, ProjectResponse } from "#projects/domain/repo";
import { UserEntity } from "#user/infra/postgres/user.model";
import { Mapper } from "src/core/domain/mapper";
import { failure, success } from "src/core/logic";
import { NotFoundError, UnexpectedError } from "src/core/logic/errors";
import { Repository } from "typeorm";
import { ProjectEntity } from "./project.model";

export class TypeORMProjectRepository implements IProjectRepository {
    constructor(
        private readonly repo: Repository<ProjectEntity>,
        private readonly mapper: Mapper<Project, ProjectEntity>
    ) {}

    async findById(id: string): Promise<ProjectResponse> {
        try {
            const project = await this.repo.findOne({
                where: { id },
                relations: { owner: true }
            });

            if (!project) {
                return failure(
                    new NotFoundError(`Project with id ${id} not found`)
                );
            }

            return success(this.mapper.toDomain(project));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }
}
