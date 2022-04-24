import { typeORMFileRepository } from "#file/infra/postgres";
import { typeORMFolderRepository } from "#folder/infra/postgres";
import { typeORMUserRepository } from "#user/infra/postgres";
import { Router } from "express";
import { requireUser } from "src/core/surfaces/express/middleware/auth";
import { UserController } from "./controller";

const router = Router();

const controller = UserController(
    typeORMUserRepository,
    typeORMFolderRepository,
    typeORMFileRepository
);

//router.get("/:id", requireUser, controller.findById);
router.get("/me", requireUser, controller.me);
router.patch("/", requireUser, controller.update);

export default router;
