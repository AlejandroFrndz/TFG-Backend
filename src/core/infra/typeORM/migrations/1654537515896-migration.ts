import { MigrationInterface, QueryRunner } from "typeorm";

export class migration1654537515896 implements MigrationInterface {
    name = 'migration1654537515896'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "Triple" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fileId" integer NOT NULL, "noun1" character varying NOT NULL, "tr1" character varying NOT NULL, "sc1" character varying NOT NULL, "verb" character varying NOT NULL, "verbDomain" character varying NOT NULL, "noun2" character varying NOT NULL, "tr2" character varying NOT NULL, "sc2" character varying NOT NULL, "frame" character varying NOT NULL, "problem" character varying NOT NULL, "examples" character varying NOT NULL, "pos" character varying NOT NULL, "corpus" double precision NOT NULL, "occurs" character varying NOT NULL, "sources" character varying NOT NULL, "pmiCorpus" double precision NOT NULL, "diceCorpus" double precision NOT NULL, "tCorpus" double precision NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "projectId" uuid NOT NULL, CONSTRAINT "PK_42cf48661d8d0888848e5b2cecf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "Triple" ADD CONSTRAINT "FK_ad1c9bee69b42b927b1ea880acc" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Triple" DROP CONSTRAINT "FK_ad1c9bee69b42b927b1ea880acc"`);
        await queryRunner.query(`DROP TABLE "Triple"`);
    }

}
