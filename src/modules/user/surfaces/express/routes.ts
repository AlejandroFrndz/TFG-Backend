import { typeORMUserRepository } from "#user/infra/postgres";
import { Router } from "express";
import { requireUser } from "src/core/surfaces/express/middleware/auth";
import { UserController } from "./controller";

const router = Router();

const controller = UserController(typeORMUserRepository);

//router.get("/:id", requireUser, controller.findById);
router.get("/me", requireUser, controller.me);

export default router;
