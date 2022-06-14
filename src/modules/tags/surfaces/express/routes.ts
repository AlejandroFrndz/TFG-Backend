import { Router } from "express";
import lexicalDomainTagRouter from "#tags/modules/LexicalDomain/surfaces/express/routes";
import semanticCategoriesTagRouter from "#tags/modules/SemanticCategories/surfaces/express/routes";
import semanticRolesTagRouter from "#tags/modules/SemanticRoles/surfaces/express/routes";
import { TagsController } from "./controller";
import { typeORMLexicalDomainTagRepository } from "#tags/modules/LexicalDomain/infra/postgres";
import { typeORMSemanticCategoryTagRepository } from "#tags/modules/SemanticCategories/infra/postgres";
import { typeORMSemanticRoleTagRepository } from "#tags/modules/SemanticRoles/infra/postgres";
import { typeORMErrorTagRepository } from "#tags/modules/Errors/infra";

const router = Router();

const controller = TagsController(
    typeORMLexicalDomainTagRepository,
    typeORMSemanticCategoryTagRepository,
    typeORMSemanticRoleTagRepository,
    typeORMErrorTagRepository
);

router.get("/", controller.findAll);

router.use("/lexicalDomain", lexicalDomainTagRouter);
router.use("/semanticCategory", semanticCategoriesTagRouter);
router.use("/semanticRole", semanticRolesTagRouter);

export default router;
