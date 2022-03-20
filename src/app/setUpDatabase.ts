import "reflect-metadata";
import { PhotoEntity } from "#photo/infra/postgres/typeORM/photo.model";
import dataSource from "src/core/infra/typeORM/dataSource";
import { config } from "src/app/config";

const setUpDatabase = async () => {
    await dataSource.initialize();

    if (!config.isProdEnv) {
        await dataSource.synchronize();
    }

    const photo = new PhotoEntity();
    photo.name = "Me and Bears";
    photo.description = "I am near polar bears";
    photo.filename = "photo-with-bears.jpg";
    photo.views = 1;
    photo.isPublished = true;

    const photoRepo = dataSource.getRepository(PhotoEntity);

    await photoRepo.save(photo);
};

export default setUpDatabase;
