import { ProjectEntity } from "#project/infra/postgres/project.model";
import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";

@Entity({ name: "Triple" })
export class TripleEntity {
    /*
    The search scripts generate an id for each triple found, so a primary key of project & the generated id could be enough
    Nevertheless, if multiples searches are executed the generated id can be repeated, which would lead to the primary key
    being duplicated. Thus, a different id is required in order to store the triples
  */
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => ProjectEntity, { nullable: false, onDelete: "CASCADE" })
    project!: ProjectEntity;

    @Column({ type: "int", nullable: false })
    fileId!: number;

    @Column({ type: "character varying", nullable: false })
    noun1!: string;

    @Column({ type: "character varying", nullable: true })
    tr1!: string | null;

    @Column({ type: "character varying", nullable: true })
    sc1!: string | null;

    @Column({ type: "character varying", nullable: false })
    verb!: string;

    @Column({ type: "character varying", nullable: true })
    verbDomain!: string | null;

    @Column({ type: "character varying", nullable: false })
    noun2!: string;

    @Column({ type: "character varying", nullable: true })
    tr2!: string | null;

    @Column({ type: "character varying", nullable: true })
    sc2!: string | null;

    @Column({ type: "character varying", nullable: true })
    frame!: string | null;

    @Column({ type: "character varying", nullable: true })
    problem!: string | null;

    @Column({ type: "character varying", nullable: false })
    examples!: string;

    @Column({ type: "character varying", nullable: true })
    pos!: string | null;

    @Column({ type: "float", nullable: false })
    corpus!: number;

    @Column({ type: "character varying", nullable: false })
    occurs!: string;

    @Column({ type: "character varying", nullable: false })
    sources!: string;

    @Column({ type: "float", nullable: false })
    pmiCorpus!: number;

    @Column({ type: "float", nullable: false })
    diceCorpus!: number;

    @Column({ type: "float", nullable: false })
    tCorpus!: number;

    @CreateDateColumn({ type: "timestamptz" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamptz" })
    updatedAt!: Date;
}
