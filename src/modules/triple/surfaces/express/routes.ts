import { FileSystemGroupedTriplesService } from "#groupedTriples/services/FileSystem";
import { typeORMProjectRepository } from "#project/infra/postgres";
import { typeORMTripleRepository } from "#triple/infra";
import { FileSystemTripleService } from "#triple/services/FileSystem";
import { Router } from "express";
import { requireUser } from "src/core/surfaces/express/middleware/auth";
import { TripleController } from "./controller";

const router = Router();

const controller = TripleController(
    typeORMTripleRepository,
    typeORMProjectRepository,
    FileSystemTripleService,
    FileSystemGroupedTriplesService
);

router.get("/project/:projectId", requireUser, controller.getAllForProject);
router.get(
    "/project/:projectId/download",
    requireUser,
    controller.downloadFile
);
router.patch("/:tripleId", requireUser, controller.update);

export default router;
