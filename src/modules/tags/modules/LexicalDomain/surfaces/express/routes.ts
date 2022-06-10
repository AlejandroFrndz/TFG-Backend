import { typeORMLexicalDomainTagRepository } from "#tags/modules/LexicalDomain/infra/postgres";
import { Router } from "express";
import { requireAdmin } from "src/core/surfaces/express/middleware/auth";
import { LexicalDomainTagController } from "./controller";

const router = Router();

const controller = LexicalDomainTagController(
    typeORMLexicalDomainTagRepository
);

router.post("/", requireAdmin, controller.create);
router.get("/", controller.findAll);

export default router;
