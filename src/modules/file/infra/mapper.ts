import { Mapper } from "src/core/domain/mapper";
import { File } from "#file/domain";
import { FileEntity } from "./file.model";

export const FileMapper: Mapper<File, FileEntity> = {
    toDomain: (file) => {
        return {
            id: file.id,
            name: file.name,
            parent: file.parent ? file.parent.id : null,
            owner: file.owner.id,
            project: file.project
        };
    }
};
