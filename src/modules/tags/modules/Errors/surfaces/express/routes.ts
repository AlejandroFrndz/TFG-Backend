import { Router } from "express";
import { typeORMErrorTagRepository } from "#tags/modules/Errors/infra";
import { ErrorTagController } from "./controller";
import { requireAdmin } from "src/core/surfaces/express/middleware/auth";

const router = Router();

const controller = ErrorTagController(typeORMErrorTagRepository);

router.post("/", requireAdmin, controller.create);
router.get("/", controller.findAll);
router.delete("/:errorCode", requireAdmin, controller.delete);

export default router;
