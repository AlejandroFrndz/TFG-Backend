import { typeORMProjectRepository } from "#project/infra/postgres";
import { typeORMSearchRepository } from "#search/infra";
import { S3SearchService } from "#search/services/AWS/S3";
import { Router } from "express";
import { requireUser } from "src/core/surfaces/express/middleware/auth";
import { SearchController } from "./controller";
import { searchFilesUpload } from "./multer";

const router = Router();

const controller = SearchController(
    typeORMSearchRepository,
    typeORMProjectRepository,
    S3SearchService
);

router.post("/", requireUser, searchFilesUpload, controller.create);
router.delete("/:searchId", requireUser, controller.delete);
router.get("/project/:projectId", requireUser, controller.getAllForProject);

export default router;
