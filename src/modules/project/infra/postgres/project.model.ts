import { UserEntity } from "#user/infra/postgres/user.model";
import {
    ManyToOne,
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn
} from "typeorm";
import { Language, ProjectPhase } from "#project/domain";

@Entity({ name: "Project" })
export class ProjectEntity {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => UserEntity, { nullable: false, onDelete: "CASCADE" })
    owner!: UserEntity;

    @Column({ type: "enum", enum: Language, default: null, nullable: true })
    language!: Language | null;

    @Column({
        type: "enum",
        enum: ProjectPhase,
        default: ProjectPhase.Creation,
        nullable: false
    })
    phase!: ProjectPhase;

    @Column({ type: "character varying", default: null, nullable: true })
    domainName!: string | null;

    @Column({ nullable: false, default: false })
    isUsingSubdomains!: boolean;

    @CreateDateColumn({ type: "timestamptz" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamptz" })
    updatedAt!: Date;
}
