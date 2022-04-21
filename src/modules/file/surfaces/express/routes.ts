import { typeORMFileRepository } from "#file/infra";
import { typeORMFolderRepository } from "#folder/infra/postgres";
import { Router } from "express";
import { requireUser } from "src/core/surfaces/express/middleware/auth";
import { FileController } from "./controller";

const router = Router();

const controller = FileController(
    typeORMFileRepository,
    typeORMFolderRepository
);

router.post("/", requireUser, controller.create);

export default router;
