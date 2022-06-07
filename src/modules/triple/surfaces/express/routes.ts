import { typeORMProjectRepository } from "#project/infra/postgres";
import { typeORMTripleRepository } from "#triple/infra";
import { Router } from "express";
import { requireUser } from "src/core/surfaces/express/middleware/auth";
import { TripleController } from "./controller";

const router = Router();

const controller = TripleController(
    typeORMTripleRepository,
    typeORMProjectRepository
);

router.get("/:projectId", requireUser, controller.getAllForProject);

export default router;
