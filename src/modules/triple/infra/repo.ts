import { ProjectEntity } from "#project/infra/postgres/project.model";
import { FileDomainTriple, Triple } from "#triple/domain";
import { ITripleRepository, TriplesResponse } from "#triple/domain/repo";
import { Mapper } from "src/core/domain/mapper";
import { failure, success } from "src/core/logic";
import { NotFoundError, UnexpectedError } from "src/core/logic/errors";
import { Repository } from "typeorm";
import { TripleEntity } from "./triple.model";

export class TypeORMTripleRepository implements ITripleRepository {
    constructor(
        private readonly repo: Repository<TripleEntity>,
        private readonly mapper: Mapper<Triple, TripleEntity>,
        private readonly projectRepo: Repository<ProjectEntity>
    ) {}

    async createMultiple(
        fileTriples: FileDomainTriple[],
        projectId: string
    ): Promise<TriplesResponse> {
        try {
            const project = await this.projectRepo.findOne({
                where: { id: projectId }
            });

            if (!project) {
                return failure(
                    new NotFoundError(`Project with id ${projectId} not found`)
                );
            }

            const triplePromises: Promise<TripleEntity>[] = [];

            for (const fileTriple of fileTriples) {
                const { noun1, verb, noun2, ...partialTriple } = fileTriple;

                const triple = this.repo.create({
                    ...partialTriple,
                    noun1: noun1.noun,
                    tr1: noun1.tr,
                    sc1: noun1.sc,
                    verb: verb.verb,
                    verbDomain: verb.domain,
                    noun2: noun2.noun,
                    sc2: noun2.sc,
                    tr2: noun2.tr,
                    project
                });

                triplePromises.push(this.repo.save(triple));
            }

            // Accumulate promises in array and await them all with Promise.all for faster execution
            const savedTriples = await Promise.all(triplePromises);

            return success(
                savedTriples.map((triple) => this.mapper.toDomain(triple))
            );
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    async getAllForProject(projectId: string): Promise<TriplesResponse> {
        try {
            const project = await this.projectRepo.findOne({
                where: { id: projectId }
            });

            if (!project) {
                return failure(
                    new NotFoundError(`Project with id ${projectId} not found`)
                );
            }

            const triples = await this.repo.find({
                where: { project: { id: projectId } },
                relations: ["project"]
            });

            return success(
                triples.map((triple) => this.mapper.toDomain(triple))
            );
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }
}
