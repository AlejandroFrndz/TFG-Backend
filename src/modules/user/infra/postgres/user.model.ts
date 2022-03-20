import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";

@Entity({ name: "User" })
export class UserEntity {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ unique: true, nullable: false })
    username!: string;

    @Column({ nullable: false })
    passwordHash!: string;

    @Column({ default: false, nullable: false })
    isAdmin!: boolean;

    @Column({ unique: true, nullable: false })
    email!: string;

    @Column({ default: false, nullable: false })
    isEmailVerified!: boolean;

    @Column({ nullable: false })
    code!: string;

    @CreateDateColumn({ type: "timestamptz" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamptz" })
    updatedAt!: Date;
}
