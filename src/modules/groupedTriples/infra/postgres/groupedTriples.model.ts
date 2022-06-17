import { ProjectEntity } from "#project/infra/postgres/project.model";
import { LexicalDomainTagEntity } from "#tags/modules/LexicalDomain/infra/postgres/lexicalDomainTag.model";
import { SemanticCategoryTagEntity } from "#tags/modules/SemanticCategories/infra/postgres/semanticCategoryTag.model";
import { SemanticRoleTagEntity } from "#tags/modules/SemanticRoles/infra/postgres/semanticRoleTag.model";
import {
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryColumn,
    BeforeInsert
} from "typeorm";

@Entity({ name: "GroupedTriples" })
export class GroupedTriplesEntity {
    @PrimaryColumn()
    projectId!: string;

    @ManyToOne(() => ProjectEntity, {
        onDelete: "CASCADE",
        nullable: false
    })
    project!: ProjectEntity;

    @PrimaryColumn({ type: "int" })
    combinationNum!: number;

    @Column({ type: "character varying", nullable: false })
    args1!: string;

    @ManyToOne(() => SemanticRoleTagEntity, (tag) => tag.tag, {
        nullable: true
    })
    tr1!: string | null;

    @ManyToOne(() => SemanticCategoryTagEntity, (tag) => tag.tag, {
        nullable: true
    })
    sc1!: string | null;

    @Column({ type: "character varying", nullable: false })
    verbs!: string;

    @ManyToOne(() => LexicalDomainTagEntity, (tag) => tag.tag, {
        nullable: true
    })
    domain!: string | null;

    @Column({ type: "character varying", nullable: false })
    args2!: string;

    @ManyToOne(() => SemanticRoleTagEntity, (tag) => tag.tag, {
        nullable: true
    })
    tr2!: string | null;

    @ManyToOne(() => SemanticCategoryTagEntity, (tag) => tag.tag, {
        nullable: true
    })
    sc2!: string | null;

    @CreateDateColumn({ type: "timestamptz" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamptz" })
    updatedAt!: Date;

    @BeforeInsert()
    lowercaseTags() {
        this.tr1 = this.tr1 ? this.tr1.toLowerCase() : null;
        this.sc1 = this.sc1 ? this.sc1.toLocaleLowerCase() : null;
        this.domain = this.domain ? this.domain.toLocaleLowerCase() : null;
        this.tr2 = this.tr2 ? this.tr2.toLowerCase() : null;
        this.sc2 = this.sc2 ? this.sc2.toLocaleLowerCase() : null;
    }
}
