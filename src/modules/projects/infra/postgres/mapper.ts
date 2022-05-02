import { Project } from "#projects/domain";
import { Mapper } from "src/core/domain/mapper";
import { ProjectEntity } from "./project.model";

export const ProjectMapper: Mapper<Project, ProjectEntity> = {
    toDomain: (project) => ({
        id: project.id,
        owner: project.owner.id,
        language: project.language,
        domainName: project.domainName,
        isUsingSubdomains: project.isUsingSubdomains
    })
};
