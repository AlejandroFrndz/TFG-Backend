import { MigrationInterface, QueryRunner } from "typeorm";

export class migration1655463029588 implements MigrationInterface {
    name = 'migration1655463029588'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "GroupedTriples" ("projectId" uuid NOT NULL, "combinationNum" integer NOT NULL, "args1" character varying NOT NULL, "verbs" character varying NOT NULL, "args2" character varying NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tr1Tag" character varying, "sc1Tag" character varying, "domainTag" character varying, "tr2Tag" character varying, "sc2Tag" character varying, CONSTRAINT "PK_67ef10f67e653563c34b3f51985" PRIMARY KEY ("projectId", "combinationNum"))`);
        await queryRunner.query(`ALTER TABLE "GroupedTriples" ADD CONSTRAINT "FK_99760e8f60298497bd8700e58f8" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "GroupedTriples" ADD CONSTRAINT "FK_4be0120afd5653d5c621eb2cfba" FOREIGN KEY ("tr1Tag") REFERENCES "SemanticRoleTag"("tag") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "GroupedTriples" ADD CONSTRAINT "FK_14e528fb68d740bd7b22bf1bddd" FOREIGN KEY ("sc1Tag") REFERENCES "SemanticCategoryTag"("tag") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "GroupedTriples" ADD CONSTRAINT "FK_df03962d792792eae7749bea061" FOREIGN KEY ("domainTag") REFERENCES "LexicalDomainTag"("tag") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "GroupedTriples" ADD CONSTRAINT "FK_cc85d52ba390e3976a152404043" FOREIGN KEY ("tr2Tag") REFERENCES "SemanticRoleTag"("tag") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "GroupedTriples" ADD CONSTRAINT "FK_202b0f94c923065b8d2ebf4a933" FOREIGN KEY ("sc2Tag") REFERENCES "SemanticCategoryTag"("tag") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "GroupedTriples" DROP CONSTRAINT "FK_202b0f94c923065b8d2ebf4a933"`);
        await queryRunner.query(`ALTER TABLE "GroupedTriples" DROP CONSTRAINT "FK_cc85d52ba390e3976a152404043"`);
        await queryRunner.query(`ALTER TABLE "GroupedTriples" DROP CONSTRAINT "FK_df03962d792792eae7749bea061"`);
        await queryRunner.query(`ALTER TABLE "GroupedTriples" DROP CONSTRAINT "FK_14e528fb68d740bd7b22bf1bddd"`);
        await queryRunner.query(`ALTER TABLE "GroupedTriples" DROP CONSTRAINT "FK_4be0120afd5653d5c621eb2cfba"`);
        await queryRunner.query(`ALTER TABLE "GroupedTriples" DROP CONSTRAINT "FK_99760e8f60298497bd8700e58f8"`);
        await queryRunner.query(`DROP TABLE "GroupedTriples"`);
    }

}
