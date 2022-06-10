import { Mapper } from "src/core/domain/mapper";
import { failure, success } from "src/core/logic";
import { UnexpectedError } from "src/core/logic/errors";
import { PrimaryKeyConstraintError } from "src/core/logic/errors/PrimaryKeyConstraintError";
import { Repository } from "typeorm";
import {
    ILexicalDomainTagRepository,
    LexicalDomainTag,
    LexicalDomainTagResponse
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
}
