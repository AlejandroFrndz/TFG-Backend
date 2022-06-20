import { Router } from "express";
import { requireAdmin } from "src/core/surfaces/express/middleware/auth";
import { typeORMSemanticCategoryTagRepository } from "#tags/modules/SemanticCategories/infra/postgres/index";
import { SemanticCategoryTagController } from "./controller";

const router = Router();

const controller = SemanticCategoryTagController(
    typeORMSemanticCategoryTagRepository
);

router.post("/", requireAdmin, controller.create);
router.get("/", controller.findAll);
router.delete("/:tagName", requireAdmin, controller.delete);

export default router;
