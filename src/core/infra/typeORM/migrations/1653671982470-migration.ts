import { MigrationInterface, QueryRunner } from "typeorm";

export class migration1653671982470 implements MigrationInterface {
    name = 'migration1653671982470'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."Search_noun1type_enum" AS ENUM('string', 'file', 'any')`);
        await queryRunner.query(`CREATE TYPE "public"."Search_verbtype_enum" AS ENUM('string', 'file', 'any')`);
        await queryRunner.query(`CREATE TYPE "public"."Search_noun2type_enum" AS ENUM('string', 'file', 'any')`);
        await queryRunner.query(`CREATE TABLE "Search" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "noun1Type" "public"."Search_noun1type_enum" NOT NULL, "noun1Value" character varying, "noun1FileLocation" character varying, "verbType" "public"."Search_verbtype_enum" NOT NULL, "verbValue" character varying, "verbFileLocation" character varying, "noun2Type" "public"."Search_noun2type_enum" NOT NULL, "noun2Value" character varying, "noun2FileLocation" character varying, "isUsingSynt" boolean NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "projectId" uuid NOT NULL, CONSTRAINT "PK_d1bcd714e9b3fd9c56b80e68ca1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "Search" ADD CONSTRAINT "FK_b42a8f6617ce2a45ac2a612fc1d" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Search" DROP CONSTRAINT "FK_b42a8f6617ce2a45ac2a612fc1d"`);
        await queryRunner.query(`DROP TABLE "Search"`);
        await queryRunner.query(`DROP TYPE "public"."Search_noun2type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."Search_verbtype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."Search_noun1type_enum"`);
    }

}
