import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryColumn,
    UpdateDateColumn
} from "typeorm";

@Entity({ name: "ErrorTag" })
export class ErrorTagEntity {
    @PrimaryColumn({ type: "smallint" })
    errorCode!: number;

    @Column({ type: "character varying" })
    humanReadable!: string;

    @CreateDateColumn({ type: "timestamptz" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamptz" })
    updatedAt!: Date;
}
