import { MigrationInterface, QueryRunner } from "typeorm";

export class migration1655486139675 implements MigrationInterface {
    name = 'migration1655486139675'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "GroupedTriples" ADD "tr1" character varying`);
        await queryRunner.query(`ALTER TABLE "GroupedTriples" ADD "sc1" character varying`);
        await queryRunner.query(`ALTER TABLE "GroupedTriples" ADD "domain" character varying`);
        await queryRunner.query(`ALTER TABLE "GroupedTriples" ADD "tr2" character varying`);
        await queryRunner.query(`ALTER TABLE "GroupedTriples" ADD "sc2" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "GroupedTriples" DROP COLUMN "sc2"`);
        await queryRunner.query(`ALTER TABLE "GroupedTriples" DROP COLUMN "tr2"`);
        await queryRunner.query(`ALTER TABLE "GroupedTriples" DROP COLUMN "domain"`);
        await queryRunner.query(`ALTER TABLE "GroupedTriples" DROP COLUMN "sc1"`);
        await queryRunner.query(`ALTER TABLE "GroupedTriples" DROP COLUMN "tr1"`);
    }

}
