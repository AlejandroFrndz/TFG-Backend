import { typeORMProjectRepository } from "#project/infra/postgres";
import { Router } from "express";
import { requireUser } from "src/core/surfaces/express/middleware/auth";
import { ProjectController } from "./controller";

const router = Router();

const controller = ProjectController(typeORMProjectRepository);

router.get("/:projectId", requireUser, controller.findById);

export default router;
