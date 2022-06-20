import { Mapper } from "src/core/domain/mapper";
import { EmptyResponse, failure, success } from "src/core/logic";
import { NotFoundError, UnexpectedError } from "src/core/logic/errors";
import { PrimaryKeyConstraintError } from "src/core/logic/errors/PrimaryKeyConstraintError";
import { Repository } from "typeorm";
import {
    ILexicalDomainTagRepository,
    LexicalDomainTag,
    LexicalDomainTagResponse,
    LexicalDomainTagsResponse
} from "../../domain";
import { LexicalDomainTagEntity } from "./lexicalDomainTag.model";

export class TypeORMLexicalDomainTagRepository
    implements ILexicalDomainTagRepository
{
    constructor(
        private readonly repo: Repository<LexicalDomainTagEntity>,
        private readonly mapper: Mapper<
            LexicalDomainTag,
            LexicalDomainTagEntity
        >
    ) {}

    async create(tag: LexicalDomainTag): Promise<LexicalDomainTagResponse> {
        try {
            const lowercaseTagName = tag.tag.toLowerCase();

            const foundTag = await this.repo.findOne({
                where: { tag: lowercaseTagName }
            });

            if (foundTag) {
                return failure(new PrimaryKeyConstraintError(tag.tag));
            }

            const newTag = this.repo.create(tag);

            const savedTag = await this.repo.save(newTag);

            return success(this.mapper.toDomain(savedTag));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    async findAll(): Promise<LexicalDomainTagsResponse> {
        try {
            const tags = await this.repo.find();

            return success(tags.map((tag) => this.mapper.toDomain(tag)));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    async delete(tagName: string): Promise<EmptyResponse> {
        try {
            const tag = await this.repo.findOne({ where: { tag: tagName } });

            if (!tag) {
                return failure(
                    new NotFoundError(`Lexical domain tag ${tagName} not found`)
                );
            }

            await this.repo.remove(tag);

            return success(null);
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }
}
