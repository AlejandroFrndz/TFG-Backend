import { ProjectEntity } from "#project/infra/postgres/project.model";
import { SearchParameterType } from "#search/domain";
import {
    Entity,
    PrimaryGeneratedColumn,
    ManyToOne,
    Column,
    CreateDateColumn,
    UpdateDateColumn
} from "typeorm";

@Entity({ name: "Search" })
export class SearchEntity {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => ProjectEntity, { nullable: false, onDelete: "CASCADE" })
    project!: ProjectEntity;

    @Column({ type: "enum", enum: SearchParameterType, nullable: false })
    noun1Type!: SearchParameterType;

    @Column({ type: "character varying", nullable: true })
    noun1Value!: string | null;

    @Column({ type: "character varying", nullable: true })
    noun1FileLocation!: string | null;

    @Column({ type: "enum", enum: SearchParameterType, nullable: false })
    verbType!: SearchParameterType;

    @Column({ type: "character varying", nullable: true })
    verbValue!: string | null;

    @Column({ type: "character varying", nullable: true })
    verbFileLocation!: string | null;

    @Column({ type: "enum", enum: SearchParameterType, nullable: false })
    noun2Type!: SearchParameterType;

    @Column({ type: "character varying", nullable: true })
    noun2Value!: string | null;

    @Column({ type: "character varying", nullable: true })
    noun2FileLocation!: string | null;

    @Column({ type: "boolean", nullable: false })
    isUsingSynt!: boolean;

    @CreateDateColumn({ type: "timestamptz" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamptz" })
    updatedAt!: Date;
}
