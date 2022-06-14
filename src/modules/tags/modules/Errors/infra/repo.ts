import { Repository } from "typeorm";
import {
    ErrorTag,
    ErrorTagResponse,
    ErrorTagsResponse,
    IErrorTagRepository
} from "#tags/modules/Errors/domain";
import { ErrorTagEntity } from "./errorTag.model";
import { Mapper } from "src/core/domain/mapper";
import { EmptyResponse, failure, success } from "src/core/logic";
import {
    NotFoundError,
    PrimaryKeyConstraintError,
    UnexpectedError
} from "src/core/logic/errors";

export class TypeORMErrorTagRepository implements IErrorTagRepository {
    constructor(
        private readonly repo: Repository<ErrorTagEntity>,
        private readonly mapper: Mapper<ErrorTag, ErrorTagEntity>
    ) {}

    async create(tag: ErrorTag): Promise<ErrorTagResponse> {
        try {
            const foundTag = await this.repo.findOne({
                where: { errorCode: tag.errorCode }
            });

            if (foundTag) {
                return failure(
                    new PrimaryKeyConstraintError(tag.errorCode.toString())
                );
            }

            const newTag = this.repo.create(tag);

            const savedTag = await this.repo.save(newTag);

            return success(this.mapper.toDomain(savedTag));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    async findAll(): Promise<ErrorTagsResponse> {
        try {
            const tags = await this.repo.find();

            return success(tags.map((tag) => this.mapper.toDomain(tag)));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    async delete(errorCode: number): Promise<EmptyResponse> {
        try {
            const tag = await this.repo.findOne({ where: { errorCode } });

            if (!tag) {
                return failure(
                    new NotFoundError(
                        `Lexical domain tag ${errorCode} not found`
                    )
                );
            }

            await this.repo.remove(tag);

            return success(null);
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }
}
