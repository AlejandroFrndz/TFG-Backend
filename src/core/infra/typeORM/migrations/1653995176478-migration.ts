import { MigrationInterface, QueryRunner } from "typeorm";

export class migration1653995176478 implements MigrationInterface {
    name = 'migration1653995176478'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Search" DROP COLUMN "noun1FileLocation"`);
        await queryRunner.query(`ALTER TABLE "Search" DROP COLUMN "verbFileLocation"`);
        await queryRunner.query(`ALTER TABLE "Search" DROP COLUMN "noun2FileLocation"`);
        await queryRunner.query(`ALTER TABLE "Search" ALTER COLUMN "noun1Value" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "Search" ALTER COLUMN "verbValue" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "Search" ALTER COLUMN "noun2Value" SET NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Search" ALTER COLUMN "noun2Value" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "Search" ALTER COLUMN "verbValue" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "Search" ALTER COLUMN "noun1Value" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "Search" ADD "noun2FileLocation" character varying`);
        await queryRunner.query(`ALTER TABLE "Search" ADD "verbFileLocation" character varying`);
        await queryRunner.query(`ALTER TABLE "Search" ADD "noun1FileLocation" character varying`);
    }

}
