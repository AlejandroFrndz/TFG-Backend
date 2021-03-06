import { UserEntity } from "#user/infra/postgres/user.model";
import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";

@Entity({ name: "Folder" })
export class FolderEntity {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ nullable: false })
    name!: string;

    @ManyToOne(() => UserEntity, { nullable: false, onDelete: "CASCADE" })
    owner!: UserEntity;

    @ManyToOne(() => FolderEntity, { nullable: true, onDelete: "CASCADE" })
    parent!: FolderEntity | null;

    @CreateDateColumn({ type: "timestamptz" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamptz" })
    updatedAt!: Date;
}
