import { Router } from "express";
import { requireAdmin } from "src/core/surfaces/express/middleware/auth";
import { typeORMSemanticCategoryTagRepository } from "../../infra/postgres";
import { SemanticCategoryTagController } from "./controller";

const router = Router();

const controller = SemanticCategoryTagController(
    typeORMSemanticCategoryTagRepository
);

router.post("/", requireAdmin, controller.create);
router.get("/", controller.findAll);

export default router;
