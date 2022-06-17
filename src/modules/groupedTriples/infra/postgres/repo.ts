import {
    GroupedTriples,
    GroupedTriplesArrayResponse,
    GroupedTriplesResponse,
    IGroupedTriplesRepository
} from "#groupedTriples/domain";
import { ProjectEntity } from "#project/infra/postgres/project.model";
import { Mapper } from "src/core/domain/mapper";
import { EmptyResponse, failure, success } from "src/core/logic";
import { NotFoundError, UnexpectedError } from "src/core/logic/errors";
import { Repository } from "typeorm";
import { GroupedTriplesEntity } from "./groupedTriples.model";

export class TypeORMGroupedTriplesRepository
    implements IGroupedTriplesRepository
{
    constructor(
        private readonly repo: Repository<GroupedTriplesEntity>,
        private readonly mapper: Mapper<GroupedTriples, GroupedTriplesEntity>,
        private readonly projectRepo: Repository<ProjectEntity>
    ) {}

    async create(params: GroupedTriples): Promise<GroupedTriplesResponse> {
        try {
            const { projectId, combinationNum, args1, verbs, args2 } = params;

            const project = await this.projectRepo.findOne({
                where: { id: projectId }
            });

            if (!project) {
                return failure(
                    new NotFoundError(`Project with id ${projectId} not found`)
                );
            }

            const groupedTriples = this.repo.create({
                project,
                combinationNum,
                args1: args1.nouns,
                tr1: args1.tr,
                sc1: args1.sc,
                verbs: verbs.verbs,
                domain: verbs.domain,
                args2: args2.nouns,
                tr2: args2.tr,
                sc2: args2.sc
            });

            const createdGroupedTriples = await this.repo.save(groupedTriples);

            return success(this.mapper.toDomain(createdGroupedTriples));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    async getAllForProject(
        projectId: string
    ): Promise<GroupedTriplesArrayResponse> {
        try {
            const groupedTriples = await this.repo.find({
                where: { projectId }
            });

            return success(
                groupedTriples.map((group) => this.mapper.toDomain(group))
            );
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    async removeAllForProject(projectId: string): Promise<EmptyResponse> {
        try {
            const entitiesToDelete = await this.repo.find({
                where: { projectId }
            });

            await this.repo.remove(entitiesToDelete);

            return success(null);
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }
}
