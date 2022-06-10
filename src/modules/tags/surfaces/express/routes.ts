import { Router } from "express";
import lexicalDomainTagRouter from "#tags/modules/LexicalDomain/surfaces/express/routes";
import semanticCategoriesTagRouter from "#tags/modules/SemanticCategories/surfaces/express/routes";
import semanticRolesTagRouter from "#tags/modules/SemanticRoles/surfaces/express/routes";

const router = Router();

router.use("/lexicalDomain", lexicalDomainTagRouter);
router.use("/semanticCategory", semanticCategoriesTagRouter);
router.use("/semanticRole", semanticRolesTagRouter);

export default router;
