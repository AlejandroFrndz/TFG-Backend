import { typeORMFileRepository } from "#file/infra/postgres";
import { typeORMFolderRepository } from "#folder/infra/postgres";
import { typeORMUserRepository } from "#user/infra/postgres";
import { Router } from "express";
import {
    requireAdmin,
    requireUser
} from "src/core/surfaces/express/middleware/auth";
import { UserController } from "./controller";

const router = Router();

const controller = UserController(
    typeORMUserRepository,
    typeORMFolderRepository,
    typeORMFileRepository
);

//router.get("/:id", requireUser, controller.findById);
router.get("/me", requireUser, controller.me);
router.patch("/me", requireUser, controller.update);
router.delete("/me", requireUser, controller.delete);
router.get("/", requireAdmin, controller.adminFindAll);
router.patch("/:userId", requireAdmin, controller.adminUpdate);
router.delete("/:userId", requireAdmin, controller.adminDelete);

export default router;
