import { MigrationInterface, QueryRunner } from "typeorm";

export class migration1655221462916 implements MigrationInterface {
    name = 'migration1655221462916'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "ErrorTag" ("errorCode" smallint NOT NULL, "humanReadable" character varying NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0ed6f32765c288c7807a33a7b55" PRIMARY KEY ("errorCode"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "ErrorTag"`);
    }

}
