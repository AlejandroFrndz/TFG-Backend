import { MigrationInterface, QueryRunner } from "typeorm";

export class migration1654537818220 implements MigrationInterface {
    name = 'migration1654537818220'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Triple" ALTER COLUMN "tr1" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "Triple" ALTER COLUMN "sc1" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "Triple" ALTER COLUMN "verbDomain" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "Triple" ALTER COLUMN "tr2" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "Triple" ALTER COLUMN "sc2" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "Triple" ALTER COLUMN "frame" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "Triple" ALTER COLUMN "problem" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "Triple" ALTER COLUMN "pos" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Triple" ALTER COLUMN "pos" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "Triple" ALTER COLUMN "problem" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "Triple" ALTER COLUMN "frame" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "Triple" ALTER COLUMN "sc2" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "Triple" ALTER COLUMN "tr2" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "Triple" ALTER COLUMN "verbDomain" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "Triple" ALTER COLUMN "sc1" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "Triple" ALTER COLUMN "tr1" SET NOT NULL`);
    }

}
