import { SemanticRoleTag } from "#tags/modules/SemanticRoles/domain";
import {
    ISemanticRoleTagRepository,
    SemanticRoleTagResponse,
    SemanticRoleTagsResponse
} from "#tags/modules/SemanticRoles/domain/repo";
import { Mapper } from "src/core/domain/mapper";
import { failure, success } from "src/core/logic";
import {
    PrimaryKeyConstraintError,
    UnexpectedError
} from "src/core/logic/errors";
import { Repository } from "typeorm";
import { SemanticRoleTagEntity } from "./semanticRoleTag.model";

export class TypeORMSemanticRoleTagRepository
    implements ISemanticRoleTagRepository
{
    constructor(
        private readonly repo: Repository<SemanticRoleTagEntity>,
        private readonly mapper: Mapper<SemanticRoleTag, SemanticRoleTagEntity>
    ) {}

    async create(tag: SemanticRoleTag): Promise<SemanticRoleTagResponse> {
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

    async findAll(): Promise<SemanticRoleTagsResponse> {
        try {
            const tags = await this.repo.find();

            return success(tags.map((tag) => this.mapper.toDomain(tag)));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }
}
