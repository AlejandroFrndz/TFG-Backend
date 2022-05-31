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

export default router;
