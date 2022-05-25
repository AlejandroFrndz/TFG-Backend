import { MigrationInterface, QueryRunner } from "typeorm";

export class migration1651515335490 implements MigrationInterface {
    name = 'migration1651515335490'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."Project_phase_enum" AS ENUM('Creation', 'Analysis', 'Tagging', 'Visualization')`);
        await queryRunner.query(`ALTER TABLE "Project" ADD "phase" "public"."Project_phase_enum" NOT NULL DEFAULT 'Creation'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Project" DROP COLUMN "phase"`);
        await queryRunner.query(`DROP TYPE "public"."Project_phase_enum"`);
    }

}
