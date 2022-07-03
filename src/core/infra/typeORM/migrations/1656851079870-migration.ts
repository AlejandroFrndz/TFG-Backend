import { MigrationInterface, QueryRunner } from "typeorm";

export class migration1656851079870 implements MigrationInterface {
    name = 'migration1656851079870'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Search" ADD "description" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Search" DROP COLUMN "description"`);
    }

}
