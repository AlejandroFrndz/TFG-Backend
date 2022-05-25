import { MigrationInterface, QueryRunner } from "typeorm";

export class migration1651505880108 implements MigrationInterface {
    name = 'migration1651505880108'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "File" RENAME COLUMN "project" TO "projectId"`);
        await queryRunner.query(`CREATE TYPE "public"."Project_language_enum" AS ENUM('English', 'Spanish', 'French')`);
        await queryRunner.query(`CREATE TABLE "Project" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "language" "public"."Project_language_enum", "domainName" character varying NOT NULL, "isUsingSubdomains" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "ownerId" uuid NOT NULL, CONSTRAINT "PK_2725f461500317f74b0c8f11859" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "File" DROP COLUMN "projectId"`);
        await queryRunner.query(`ALTER TABLE "File" ADD "projectId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "Project" ADD CONSTRAINT "FK_a1e77a895fb30b6828e36828115" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "File" ADD CONSTRAINT "FK_eb6f5964ed22d41fea28400051f" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "File" DROP CONSTRAINT "FK_eb6f5964ed22d41fea28400051f"`);
        await queryRunner.query(`ALTER TABLE "Project" DROP CONSTRAINT "FK_a1e77a895fb30b6828e36828115"`);
        await queryRunner.query(`ALTER TABLE "File" DROP COLUMN "projectId"`);
        await queryRunner.query(`ALTER TABLE "File" ADD "projectId" character varying NOT NULL`);
        await queryRunner.query(`DROP TABLE "Project"`);
        await queryRunner.query(`DROP TYPE "public"."Project_language_enum"`);
        await queryRunner.query(`ALTER TABLE "File" RENAME COLUMN "projectId" TO "project"`);
    }

}
