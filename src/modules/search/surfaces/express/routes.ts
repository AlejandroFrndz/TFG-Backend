import { typeORMProjectRepository } from "#project/infra/postgres";
import { typeORMSearchRepository } from "#search/infra";
import { Router } from "express";
import { requireUser } from "src/core/surfaces/express/middleware/auth";
import { SearchController } from "./controller";
import { searchFilesUpload } from "./multer";

const router = Router();

const controller = SearchController(
    typeORMSearchRepository,
    typeORMProjectRepository
);

router.post("/", requireUser, searchFilesUpload, controller.create);
router.delete("/:searchId", requireUser, controller.delete);
router.get("/project/:projectId", requireUser, controller.getAllForProject);
router.get("/project/:projectId/run", requireUser, controller.runSearches);

export default router;
