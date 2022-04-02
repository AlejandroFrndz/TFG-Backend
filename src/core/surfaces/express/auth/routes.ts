import { Router } from "express";
import { AuthController } from "./controller";
import { typeORMUserRepository } from "#user/infra/postgres";

const router = Router();

const controller = AuthController(typeORMUserRepository);

router.post("/singup", controller.singup);
router.post("/singin", controller.singin);

export default router;
