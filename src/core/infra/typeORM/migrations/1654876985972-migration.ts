import { MigrationInterface, QueryRunner } from "typeorm";

export class migration1654876985972 implements MigrationInterface {
    name = 'migration1654876985972'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "SemanticRoleTag" ("tag" character varying NOT NULL, "definition" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_12cec1aed5e7a0ed24eeba53627" PRIMARY KEY ("tag"))`);
        await queryRunner.query(`CREATE TABLE "SemanticCategoryTag" ("tag" character varying NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "ancestorTag" character varying, CONSTRAINT "PK_e7980d1eb6c7714b8d00be6eb8a" PRIMARY KEY ("tag"))`);
        await queryRunner.query(`CREATE TABLE "LexicalDomainTag" ("tag" character varying NOT NULL, "protoVerbs" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d00dc009b32912cb6a72ceda05a" PRIMARY KEY ("tag"))`);
        await queryRunner.query(`ALTER TABLE "SemanticCategoryTag" ADD CONSTRAINT "FK_2279f5c0aad01e68f8bf2fa955c" FOREIGN KEY ("ancestorTag") REFERENCES "SemanticCategoryTag"("tag") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "SemanticCategoryTag" DROP CONSTRAINT "FK_2279f5c0aad01e68f8bf2fa955c"`);
        await queryRunner.query(`DROP TABLE "LexicalDomainTag"`);
        await queryRunner.query(`DROP TABLE "SemanticCategoryTag"`);
        await queryRunner.query(`DROP TABLE "SemanticRoleTag"`);
    }

}
