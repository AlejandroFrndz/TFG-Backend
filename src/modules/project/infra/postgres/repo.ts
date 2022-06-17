import { Project, ProjectPhase } from "#project/domain";
import {
    IProjectRepository,
    ProjectDetails,
    ProjectResponse
} from "#project/domain/repo";
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

    async updateDetails(
        id: string,
        projectDetails: ProjectDetails
    ): Promise<ProjectResponse> {
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

            project.domainName = projectDetails.domainName;
            project.isUsingSubdomains = projectDetails.isUsingSubdomains;
            project.language = projectDetails.language;

            const savedProject = await this.repo.save(project);

            return success(this.mapper.toDomain(savedProject));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    async finishCreation(id: string): Promise<ProjectResponse> {
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

            project.phase = ProjectPhase.Analysis;

            const savedProject = await this.repo.save(project);

            return success(this.mapper.toDomain(savedProject));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    async finishAnalysis(id: string): Promise<ProjectResponse> {
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

            project.phase = ProjectPhase.Tagging;

            const savedProject = await this.repo.save(project);

            return success(this.mapper.toDomain(savedProject));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    async finishTagging(id: string): Promise<ProjectResponse> {
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

            project.phase = ProjectPhase.Visualization;

            const savedProject = await this.repo.save(project);

            return success(this.mapper.toDomain(savedProject));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    async finishPhase(
        id: string,
        phase: ProjectPhase
    ): Promise<ProjectResponse> {
        try {
            const project = await this.repo.findOne({
                where: { id },
                relations: ["owner"]
            });

            if (!project) {
                return failure(
                    new NotFoundError(`Project with id ${id} not found`)
                );
            }

            if (phase === ProjectPhase.Visualization) {
                return success(this.mapper.toDomain(project));
            }

            let nextPhase: ProjectPhase;

            switch (phase) {
                case ProjectPhase.Creation:
                    nextPhase = ProjectPhase.Analysis;
                    break;
                case ProjectPhase.Analysis:
                    nextPhase = ProjectPhase.Tagging;
                    break;
                case ProjectPhase.Tagging:
                    nextPhase = ProjectPhase.Visualization;
                    break;
            }

            project.phase = nextPhase;

            const savedProject = await this.repo.save(project);

            return success(this.mapper.toDomain(savedProject));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }
}
