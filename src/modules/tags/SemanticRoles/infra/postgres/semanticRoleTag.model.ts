import {
    BeforeInsert,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryColumn,
    UpdateDateColumn
} from "typeorm";

@Entity({ name: "SemanticRoleTag" })
export class SemanticRoleTagEntity {
    @PrimaryColumn()
    tag!: string;

    @Column({ type: "character varying", nullable: true })
    definition!: string | null;

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
