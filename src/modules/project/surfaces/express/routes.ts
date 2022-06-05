import { typeORMProjectRepository } from "#project/infra/postgres";
import { typeORMSearchRepository } from "#search/infra";
import { S3SearchService } from "#search/services/AWS/S3";
import { FileSystemSearchService } from "#search/services/FileSystem";
import { Router } from "express";
import { requireUser } from "src/core/surfaces/express/middleware/auth";
import { ProjectController } from "./controller";
import { corpusUpload } from "./multer";

const router = Router();

const controller = ProjectController(
    typeORMProjectRepository,
    typeORMSearchRepository,
    S3SearchService,
    FileSystemSearchService
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

export default router;
