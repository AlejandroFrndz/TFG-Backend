import { typeORMFileRepository } from "#file/infra/postgres";
import { typeORMFolderRepository } from "#folder/infra/postgres";
import { Router } from "express";
import { requireUser } from "src/core/surfaces/express/middleware/auth";
import { FileController } from "./controller";

const router = Router();

const controller = FileController(
    typeORMFileRepository,
    typeORMFolderRepository
);

router.get("/", requireUser, controller.findAllForUser);
router.post("/", requireUser, controller.create);
router.patch("/:fileId/updateParent", requireUser, controller.updateParent);
router.patch("/:fileId/rename", requireUser, controller.rename);
router.delete("/:fileId", requireUser, controller.delete);

export default router;
