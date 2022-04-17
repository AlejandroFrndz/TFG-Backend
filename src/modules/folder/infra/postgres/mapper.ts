import { Folder } from "#folder/domain";
import { Mapper } from "src/core/domain/mapper";
import { FolderEntity } from "./folder.model";

export const FolderMapper: Mapper<Folder, FolderEntity> = {
    toDomain: (folder) => ({
        id: folder.id,
        name: folder.name,
        parent: folder.parent,
        owner: folder.owner
    })
};
