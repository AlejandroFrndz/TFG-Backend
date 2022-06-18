import { typeORMGroupedTriplesRepository } from "#groupedTriples/infra/postgres";
import { FileSystemGroupedTriplesService } from "#groupedTriples/services/FileSystem";
import { typeORMProjectRepository } from "#project/infra/postgres";
import { typeORMTripleRepository } from "#triple/infra";
import { Router } from "express";
import { requireUser } from "src/core/surfaces/express/middleware/auth";
import { GroupedTriplesController } from "./controller";

const router = Router();

const controller = GroupedTriplesController(
    typeORMProjectRepository,
    typeORMGroupedTriplesRepository,
    FileSystemGroupedTriplesService,
    typeORMTripleRepository
);

router.get("/:projectId/download", requireUser, controller.downloadFile);

export default router;
