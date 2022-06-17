import { typeORMGroupedTriplesRepository } from "#groupedTriples/infra/postgres";
import { FileSystemGroupedTriplesService } from "#groupedTriples/services/FileSystem";
import { typeORMProjectRepository } from "#project/infra/postgres";
import { FileSystemProjectService } from "#project/services/FileSystem";
import { typeORMTripleRepository } from "#triple/infra";
import { TripleFileMapper } from "#triple/infra/mapper";
import { FileSystemTripleService } from "#triple/services/FileSystem";
import { Router } from "express";
import { requireUser } from "src/core/surfaces/express/middleware/auth";
import { GroupedTriplesController } from "./controller";

const router = Router();

const controller = GroupedTriplesController(
    typeORMProjectRepository,
    typeORMGroupedTriplesRepository,
    FileSystemGroupedTriplesService,
    typeORMTripleRepository,
    FileSystemTripleService,
    TripleFileMapper,
    FileSystemProjectService
);

router.get("/:projectId/download", requireUser, controller.downloadFile);

export default router;
