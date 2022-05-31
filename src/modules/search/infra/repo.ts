import { ProjectEntity } from "#project/infra/postgres/project.model";
import {
    CreateSearchParams,
    ISearchRepository,
    Search,
    SearchesResponse,
    SearchResponse
} from "#search/domain";
import { Mapper } from "src/core/domain/mapper";
import { EmptyResponse, failure, success } from "src/core/logic";
import {
    BadRequestError,
    NotFoundError,
    UnexpectedError
} from "src/core/logic/errors";
import { Repository } from "typeorm";
import { SearchEntity } from "./search.model";

export class TypeORMSearchRepository implements ISearchRepository {
    constructor(
        private readonly repo: Repository<SearchEntity>,
        private readonly mapper: Mapper<Search, SearchEntity>,
        private readonly projectRepo: Repository<ProjectEntity>
    ) {}

    async create(params: CreateSearchParams): Promise<SearchResponse> {
        try {
            const {
                noun1,
                verb,
                noun2,
                isUsingSynt,
                project: projectId
            } = params;

            const project = await this.projectRepo.findOne({
                where: { id: projectId }
            });

            if (!project) {
                return failure(
                    new NotFoundError(`Project with id ${projectId} not found`)
                );
            }

            const search = this.repo.create({
                project,
                noun1Type: noun1.type,
                noun1Value: noun1.value,
                verbType: verb.type,
                verbValue: verb.value,
                noun2Type: noun2.type,
                noun2Value: noun2.value,
                isUsingSynt
            });

            const createdSearch = await this.repo.save(search);
            return success(this.mapper.toDomain(createdSearch));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    async delete(searchId: string): Promise<EmptyResponse> {
        try {
            const search = await this.repo.findOne({ where: { id: searchId } });

            if (!search) {
                return failure(
                    new NotFoundError(`Search with id ${searchId} not found`)
                );
            }

            await this.repo.remove(search);

            return success(null);
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    async findById(searchId: string): Promise<SearchResponse> {
        try {
            const search = await this.repo.findOne({
                where: { id: searchId },
                relations: { project: true }
            });

            if (!search) {
                return failure(
                    new NotFoundError(`Search with id ${searchId} not found`)
                );
            }

            return success(this.mapper.toDomain(search));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    async getAllForProject(projectId: string): Promise<SearchesResponse> {
        try {
            const project = await this.projectRepo.findOne({
                where: { id: projectId }
            });

            if (!project) {
                return failure(
                    new NotFoundError(`Project with id ${projectId} not found`)
                );
            }

            const searches = await this.repo.find({
                where: { project: { id: project.id } },
                relations: { project: true }
            });

            return success(
                searches.map((search) => this.mapper.toDomain(search))
            );
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }
}
