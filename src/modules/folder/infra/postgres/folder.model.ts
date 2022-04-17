import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";

@Entity({ name: "Folder" })
export class FolderEntity {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ nullable: false })
    name!: string;

    @Column({ nullable: false })
    owner!: string;

    @Column({ nullable: true })
    parent!: string;

    @CreateDateColumn({ type: "timestamptz" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamptz" })
    updatedAt!: Date;
}
