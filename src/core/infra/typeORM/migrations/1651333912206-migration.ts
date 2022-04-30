import { MigrationInterface, QueryRunner } from "typeorm";

export class migration1651333912206 implements MigrationInterface {
    name = 'migration1651333912206'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "User" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "passwordHash" character varying NOT NULL, "isAdmin" boolean NOT NULL DEFAULT false, "email" character varying NOT NULL, "isEmailVerified" boolean NOT NULL DEFAULT false, "code" character varying NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_29a05908a0fa0728526d2833657" UNIQUE ("username"), CONSTRAINT "UQ_4a257d2c9837248d70640b3e36e" UNIQUE ("email"), CONSTRAINT "PK_9862f679340fb2388436a5ab3e4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "Folder" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "ownerId" uuid NOT NULL, "parentId" uuid, CONSTRAINT "PK_354a1ea101ed71eb030773aa9f3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "File" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "project" character varying NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "ownerId" uuid NOT NULL, "parentId" uuid, CONSTRAINT "PK_b287aa0a177c20740f3d917e38f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "Folder" ADD CONSTRAINT "FK_8ded1dd83cc0e5e88028b5c663c" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Folder" ADD CONSTRAINT "FK_f581215c8bb705fff699f9c620f" FOREIGN KEY ("parentId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "File" ADD CONSTRAINT "FK_e1519e879e42e93479fff7b0dc7" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "File" ADD CONSTRAINT "FK_6ff24d4359a40f5ad497ed67a8c" FOREIGN KEY ("parentId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "File" DROP CONSTRAINT "FK_6ff24d4359a40f5ad497ed67a8c"`);
        await queryRunner.query(`ALTER TABLE "File" DROP CONSTRAINT "FK_e1519e879e42e93479fff7b0dc7"`);
        await queryRunner.query(`ALTER TABLE "Folder" DROP CONSTRAINT "FK_f581215c8bb705fff699f9c620f"`);
        await queryRunner.query(`ALTER TABLE "Folder" DROP CONSTRAINT "FK_8ded1dd83cc0e5e88028b5c663c"`);
        await queryRunner.query(`DROP TABLE "File"`);
        await queryRunner.query(`DROP TABLE "Folder"`);
        await queryRunner.query(`DROP TABLE "User"`);
    }

}
