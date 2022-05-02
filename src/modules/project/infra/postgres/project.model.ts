import { UserEntity } from "#user/infra/postgres/user.model";
import {
    ManyToOne,
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn
} from "typeorm";
import { Language } from "#project/domain";

@Entity({ name: "Project" })
export class ProjectEntity {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => UserEntity, { nullable: false, onDelete: "CASCADE" })
    owner!: UserEntity;

    @Column({ type: "enum", enum: Language, default: null })
    language!: Language | null;

    @Column()
    domainName!: string | null;

    @Column({ nullable: false, default: false })
    isUsingSubdomains!: boolean;

    @CreateDateColumn({ type: "timestamptz" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamptz" })
    updatedAt!: Date;
}
