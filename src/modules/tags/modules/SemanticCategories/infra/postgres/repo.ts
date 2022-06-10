import {
    ISemanticCategoryTagRepository,
    SemanticCategoryTag,
    SemanticCategoryTagResponse
} from "#tags/modules/SemanticCategories/domain";
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
                const lowerCaseAncestorTag = tag.ancestor.toLowerCase();

                ancestorTag = await this.repo.findOne({
                    where: { tag: lowerCaseAncestorTag }
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
            // When created, subtags array is empty but TypeORM does not populate it after saving. Instead, it returns it as undefined
            // thus breaking the mapper. We need to manually set it to an empty array
            savedTag.subTags = [];

            return success(this.mapper.toDomain(savedTag));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }
}
