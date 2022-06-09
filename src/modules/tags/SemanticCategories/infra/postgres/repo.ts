import {
    ISemanticCategoryTagRepository,
    SemanticCategoryTag,
    SemanticCategoryTagResponse
} from "#tags/SemanticCategories/domain";
import { Mapper } from "src/core/domain/mapper";
import { failure, success } from "src/core/logic";
import {
    NotFoundError,
    PrimaryKeyConstraintError,
    UnexpectedError
} from "src/core/logic/errors";
import { Repository } from "typeorm";
import { SemanticCategoryTagEntity } from "./semanticCategoryTag.model";

export class TypeORMSemanticCategoryTagRepository
    implements ISemanticCategoryTagRepository
{
    constructor(
        private readonly repo: Repository<SemanticCategoryTagEntity>,
        private readonly mapper: Mapper<
            SemanticCategoryTag,
            SemanticCategoryTagEntity
        >
    ) {}

    async create(
        tag: Omit<SemanticCategoryTag, "subTags">
    ): Promise<SemanticCategoryTagResponse> {
        try {
            const lowercaseTagName = tag.tag.toLowerCase();

            const foundTag = await this.repo.findOne({
                where: { tag: lowercaseTagName }
            });

            if (foundTag) {
                return failure(new PrimaryKeyConstraintError(tag.tag));
            }

            let ancestorTag: SemanticCategoryTagEntity | null = null;

            if (tag.ancestor) {
                ancestorTag = await this.repo.findOne({
                    where: { tag: tag.ancestor }
                });

                if (!ancestorTag) {
                    return failure(
                        new NotFoundError(
                            `Semantic category tag ${tag.ancestor} not found`
                        )
                    );
                }
            }

            const newTag = this.repo.create({
                tag: tag.tag,
                ancestor: ancestorTag
            });

            const savedTag = await this.repo.save(newTag);

            return success(this.mapper.toDomain(savedTag));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }
}
