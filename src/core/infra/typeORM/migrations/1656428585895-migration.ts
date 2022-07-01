import { MigrationInterface, QueryRunner } from "typeorm";

export class migration1656428585895 implements MigrationInterface {
    name = 'migration1656428585895'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."Project_phase_enum" RENAME TO "Project_phase_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."Project_phase_enum" AS ENUM('Creation', 'ExecutingParse', 'Analysis', 'ExecutingSearch', 'Tagging', 'ExecutingGroup', 'Visualization')`);
        await queryRunner.query(`ALTER TABLE "Project" ALTER COLUMN "phase" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "Project" ALTER COLUMN "phase" TYPE "public"."Project_phase_enum" USING "phase"::"text"::"public"."Project_phase_enum"`);
        await queryRunner.query(`ALTER TABLE "Project" ALTER COLUMN "phase" SET DEFAULT 'Creation'`);
        await queryRunner.query(`DROP TYPE "public"."Project_phase_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."Project_phase_enum_old" AS ENUM('Creation', 'Analysis', 'Tagging', 'Visualization')`);
        await queryRunner.query(`ALTER TABLE "Project" ALTER COLUMN "phase" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "Project" ALTER COLUMN "phase" TYPE "public"."Project_phase_enum_old" USING "phase"::"text"::"public"."Project_phase_enum_old"`);
        await queryRunner.query(`ALTER TABLE "Project" ALTER COLUMN "phase" SET DEFAULT 'Creation'`);
        await queryRunner.query(`DROP TYPE "public"."Project_phase_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."Project_phase_enum_old" RENAME TO "Project_phase_enum"`);
    }

}
