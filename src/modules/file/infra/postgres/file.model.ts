import { FolderEntity } from "#folder/infra/postgres/folder.model";
import { ProjectEntity } from "#projects/infra/postgres/project.model";
import { UserEntity } from "#user/infra/postgres/user.model";
import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";

@Entity({ name: "File" })
export class FileEntity {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ nullable: false })
    name!: string;

    @ManyToOne(() => UserEntity, { nullable: false, onDelete: "CASCADE" })
    owner!: UserEntity;

    @ManyToOne(() => FolderEntity, { nullable: true, onDelete: "CASCADE" })
    parent!: FolderEntity | null;

    @ManyToOne(() => ProjectEntity, { nullable: false, onDelete: "CASCADE" })
    project!: ProjectEntity;

    @CreateDateColumn({ type: "timestamptz" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamptz" })
    updatedAt!: Date;
}
