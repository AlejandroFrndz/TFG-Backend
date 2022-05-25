import { typeORMProjectRepository } from "#project/infra/postgres";
import { executeParseAndIndex } from "#project/services/fileSystem";
import { Router } from "express";
import { requireUser } from "src/core/surfaces/express/middleware/auth";
import { ProjectController } from "./controller";
import { corpusUpload } from "./multer";

const router = Router();

const controller = ProjectController(typeORMProjectRepository);

router.get("/:projectId", requireUser, controller.findById);
router.patch("/:projectId", requireUser, controller.updateDetails);
router.post(
    "/:projectId/uploadCorpus",
    requireUser,
    corpusUpload,
    controller.handleCorpusUpload
);

export default router;
