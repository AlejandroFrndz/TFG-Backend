import { MigrationInterface, QueryRunner } from "typeorm";

export class migration1651506754532 implements MigrationInterface {
    name = 'migration1651506754532'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Project" ALTER COLUMN "domainName" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Project" ALTER COLUMN "domainName" SET NOT NULL`);
    }

}
