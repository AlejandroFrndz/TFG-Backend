import { Router } from "express";
import { requireAdmin } from "src/core/surfaces/express/middleware/auth";
import { typeORMSemanticRoleTagRepository } from "../../infra/postgres";
import { SemanticRoleTagController } from "./controller";

const router = Router();

const controller = SemanticRoleTagController(typeORMSemanticRoleTagRepository);

router.post("/", requireAdmin, controller.create);
router.get("/", controller.findAll);
router.delete("/:tagName", requireAdmin, controller.delete);

export default router;
