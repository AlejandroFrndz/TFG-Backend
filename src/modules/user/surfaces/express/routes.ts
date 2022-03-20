import { typeORMUserRepository } from "#user/infra/postgres";
import { Router } from "express";
import { UserController } from "./controller";

const router = Router();

const controller = UserController(typeORMUserRepository);

router.get("/:id", controller.findById);

router.post("/", controller.create);

export default router;
