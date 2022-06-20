import { typeORMGroupedTriplesRepository } from "#groupedTriples/infra/postgres";
import { FileSystemGroupedTriplesService } from "#groupedTriples/services/FileSystem";
import { typeORMProjectRepository } from "#project/infra/postgres";
import { S3ProjectService } from "#project/services/AWS/S3";
import { FileSystemProjectService } from "#project/services/FileSystem";
import { typeORMSearchRepository } from "#search/infra";
import { S3SearchService } from "#search/services/AWS/S3";
import { FileSystemSearchService } from "#search/services/FileSystem";
import { typeORMTripleRepository } from "#triple/infra";
import { TripleFileMapper } from "#triple/infra/mapper";
import { FileSystemTripleService } from "#triple/services/FileSystem";
import { Router } from "express";
import { requireUser } from "src/core/surfaces/express/middleware/auth";
import { ProjectController } from "./controller";
import { corpusUpload } from "./multer";

const router = Router();

const controller = ProjectController(
    typeORMProjectRepository,
    typeORMSearchRepository,
    S3SearchService,
    FileSystemSearchService,
    S3ProjectService,
    FileSystemProjectService,
    typeORMTripleRepository,
    FileSystemTripleService,
    TripleFileMapper,
    typeORMGroupedTriplesRepository,
    FileSystemGroupedTriplesService
);

router.get("/:projectId", requireUser, controller.findById);
router.patch("/:projectId", requireUser, controller.updateDetails);
router.post(
    "/:projectId/uploadCorpus",
    requireUser,
    corpusUpload,
    controller.handleCorpusUpload
);
router.get("/:projectId/runSearches", requireUser, controller.runSearches);
router.get("/:projectId/finishTagging", requireUser, controller.finishTagging);

export default router;
