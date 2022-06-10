import {
    BeforeInsert,
    CreateDateColumn,
    Entity,
    ManyToOne,
    OneToMany,
    PrimaryColumn,
    UpdateDateColumn
} from "typeorm";

@Entity({ name: "SemanticCategoryTag" })
export class SemanticCategoryTagEntity {
    @PrimaryColumn()
    tag!: string;

    @ManyToOne(() => SemanticCategoryTagEntity, {
        nullable: true,
        onDelete: "CASCADE"
    })
    ancestor!: SemanticCategoryTagEntity | null;

    @OneToMany(() => SemanticCategoryTagEntity, (tag) => tag.ancestor)
    subTags!: SemanticCategoryTagEntity[];

    @CreateDateColumn({ type: "timestamptz" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamptz" })
    updatedAt!: Date;

    // Given that we use the tag itself as primary column, ensure that it is inserted in lower case to prevent having duplicate tags because of
    // different/inconsistent casing
    @BeforeInsert()
    lowercaseTag() {
        this.tag = this.tag.toLowerCase();
    }
}
