import { typeORMFolderRepository } from "#folder/infra/postgres";
import { Router } from "express";
import { requireUser } from "src/core/surfaces/express/middleware/auth";
import { FolderController } from "./controller";

const router = Router();

const controller = FolderController(typeORMFolderRepository);

router.get("/", requireUser, controller.findAllForUser);
router.post("/", requireUser, controller.create);
router.patch("/:folderId/updateParent", requireUser, controller.updateParent);
router.patch("/:folderId/rename", requireUser, controller.rename);
router.delete("/:folderId", requireUser, controller.delete);

export default router;
