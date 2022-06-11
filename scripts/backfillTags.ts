// NODE_PATH=./ npx ts-node --transpile-only -r tsconfig-paths/register

import { LexicalDomainTag } from "#tags/modules/LexicalDomain/domain";
import { LexicalDomainTagEntity } from "#tags/modules/LexicalDomain/infra/postgres/lexicalDomainTag.model";
import { SemanticCategoryTagEntity } from "#tags/modules/SemanticCategories/infra/postgres/semanticCategoryTag.model";
import { SemanticRoleTag } from "#tags/modules/SemanticRoles/domain";
import { SemanticRoleTagEntity } from "#tags/modules/SemanticRoles/infra/postgres/semanticRoleTag.model";
import { exit } from "process";
import { DataSource, DataSourceOptions } from "typeorm";

const dotenv = require("dotenv");
dotenv.config({ path: "scripts/.env" });

const config = {
    type: process.env.TYPEORM_CONNECTION,
    host: process.env.TYPEORM_HOST,
    port: process.env.TYPEORM_PORT,
    username: process.env.TYPEORM_USER,
    password: process.env.TYPEORM_PASSWORD,
    database: process.env.TYPEORM_DATABASE,
    entities: [process.env.TYPEORM_ENTITIES],
    migrationsRun: false,
    logging: "all"
} as DataSourceOptions;

const LEXICAL_DOMAIN_TAGS: LexicalDomainTag[] = [
    { tag: "change", protoVerbs: "to become/change" },
    { tag: "movement", protoVerbs: "to move" },
    { tag: "existence", protoVerbs: "to be/exist" },
    { tag: "possession", protoVerbs: "to have" },
    { tag: "position", protoVerbs: "to be in a state/place/position" },
    { tag: "manipulation", protoVerbs: "to use" },
    { tag: "action", protoVerbs: "to do/make" },
    { tag: "cognition", protoVerbs: "to know/think" },
    { tag: "impact", protoVerbs: "to hit/break" }
];

const SEMANTIC_ROLE_TAGS: SemanticRoleTag[] = [
    {
        tag: "agent",
        definition:
            "Entity/process that causes an action, whether intentionally or unintentionally."
    },
    {
        tag: "result",
        definition:
            "Entity/process that has come about as a consequence of a voluntary/involuntary action."
    },
    {
        tag: "patient",
        definition:
            "Entity which is acted upon, affected, or created; or of which a state, or change of state, is predicated."
    },
    {
        tag: "theme",
        definition:
            "Entity which undergoes either a change of location or a change of possession. Also, entity whose location is being specified."
    },
    {
        tag: "location",
        definition:
            "Spatial reference point of a process or an entity (the source, goal, and path roles are often considered to be subtypes of location)."
    },
    {
        tag: "recipient",
        definition: "Entity which receives or acquires something."
    },
    {
        tag: "instrument",
        definition:
            "Entity used by an agent to perform some action. Instrument refers to the tools, machinery, and devices that are used to carry out human process events in the environment. However, natural entities can also use natural instruments."
    },
    {
        tag: "time",
        definition:
            "Phrase that situates an event in time or with respect to another event."
    },
    {
        tag: "rate",
        definition:
            "Phrase that describes changes in rate or level that occur as part of an event. In most cases, this role applies to the theme of an event."
    },
    {
        tag: "manner",
        definition:
            "Phrase that describes the method or way in which a particular event is carried out."
    },
    {
        tag: "description",
        definition:
            "Phrase that describes characteristics or behavior of the agent or theme of the event."
    },
    {
        tag: "condition",
        definition:
            "Phrase describing the environmental conditions which must hold in order for the event to take place."
    },
    {
        tag: "purpose",
        definition:
            "Process that specifies why another process occurs, i.e., specifications of some sort of aim, purpose, goal, or reason for the process occurring."
    }
];

const SEMANTIC_CATEGORY_TAGS: { tag: string; ancestor: string | null }[] = [
    //Attribute
    { tag: "attribute", ancestor: null },
    { tag: "ability", ancestor: "attribute" },
    { tag: "direction", ancestor: "attribute" },
    { tag: "location", ancestor: "attribute" },
    { tag: "measurement", ancestor: "attribute" },
    { tag: "origin", ancestor: "attribute" },
    { tag: "physical attribute", ancestor: "attribute" },
    { tag: "time", ancestor: "attribute" },
    { tag: "magnitude", ancestor: "measurement" },
    { tag: "composition", ancestor: "physical attribute" },
    { tag: "shape", ancestor: "physical attribute" },
    { tag: "size", ancestor: "physical attribute" },
    { tag: "state", ancestor: "physical attribute" },
    { tag: "level", ancestor: "magnitude" },
    { tag: "mean", ancestor: "level" },
    { tag: "climate", ancestor: "state" },
    //Entity
    { tag: "entity", ancestor: "null" },
    { tag: "creation", ancestor: "entity" },
    { tag: "artifact", ancestor: "creation" },
    { tag: "conduit", ancestor: "artifact" },
    { tag: "container", ancestor: "artifact" },
    { tag: "instrument", ancestor: "artifact" },
    { tag: "measuring instrument", ancestor: "instrument" },
    { tag: "recording instrument", ancestor: "instrument" },
    { tag: "sampling instrument", ancestor: "instrument" },
    { tag: "transforming instrument", ancestor: "instrument" },
    { tag: "vehicle", ancestor: "artifact" },
    { tag: "software", ancestor: "creation" },
    { tag: "structure", ancestor: "creation" },
    { tag: "building", ancestor: "structure" },
    { tag: "defense structure", ancestor: "structure" },
    { tag: "discipline", ancestor: "entity" },
    { tag: "force", ancestor: "entity" },
    { tag: "dynamics", ancestor: "force" },
    { tag: "energy", ancestor: "force" },
    { tag: "stress", ancestor: "force" },
    { tag: "geographic feature", ancestor: "entity" },
    { tag: "artificial geographic feature", ancestor: "geographic feature" },
    { tag: "artificial water body", ancestor: "artificial geographic feature" },
    { tag: "natural geographic feature", ancestor: "geographic feature" },
    { tag: "landform", ancestor: "natural geographic feature" },
    { tag: "natural water body", ancestor: "landform" },
    { tag: "human", ancestor: "entity" },
    { tag: "institution", ancestor: "human" },
    { tag: "specialist", ancestor: "human" },
    { tag: "information", ancestor: "entity" },
    { tag: "classification", ancestor: "information" },
    { tag: "scale", ancestor: "classification" },
    { tag: "document", ancestor: "information" },
    { tag: "law", ancestor: "document" },
    { tag: "parameter", ancestor: "information" },
    { tag: "record", ancestor: "information" },
    { tag: "representation", ancestor: "information" },
    { tag: "graph", ancestor: "representation" },
    { tag: "line", ancestor: "representation" },
    { tag: "map", ancestor: "representation" },
    { tag: "mathematical expression", ancestor: "representation" },
    { tag: "model", ancestor: "representation" },
    { tag: "picture", ancestor: "representation" },
    { tag: "unit", ancestor: "representation" },
    { tag: "theory", ancestor: "information" },
    { tag: "lifeform", ancestor: "entity" },
    { tag: "animal", ancestor: "lifeform" },
    { tag: "community", ancestor: "lifeform" },
    { tag: "animal community", ancestor: "community" },
    { tag: "plant community", ancestor: "community" },
    { tag: "fungus", ancestor: "lifeform" },
    { tag: "microorganism", ancestor: "lifeform" },
    { tag: "plant", ancestor: "lifeform" },
    { tag: "matter", ancestor: "entity" },
    { tag: "chemical substance", ancestor: "matter" },
    { tag: "fluid matter", ancestor: "matter" },
    { tag: "fluid astronomical body", ancestor: "fluid matter" },
    { tag: "gas", ancestor: "fluid matter" },
    { tag: "water", ancestor: "fluid matter" },
    { tag: "cloud", ancestor: "water" },
    { tag: "particle", ancestor: "matter" },
    { tag: "solid matter", ancestor: "matter" },
    { tag: "deposit", ancestor: "solid matter" },
    { tag: "material", ancestor: "solid matter" },
    { tag: "mineral", ancestor: "material" },
    { tag: "rock", ancestor: "material" },
    { tag: "soil", ancestor: "material" },
    { tag: "snow/ice", ancestor: "solid matter" },
    { tag: "solid astronomical body", ancestor: "solid matter" },
    { tag: "part", ancestor: "entity" },
    { tag: "part of instrument", ancestor: "part" },
    { tag: "part of landform", ancestor: "part" },
    { tag: "part of lifeform", ancestor: "part" },
    { tag: "part of animal", ancestor: "part of lifeform" },
    { tag: "part of fungus", ancestor: "part of lifeform" },
    { tag: "part of plant", ancestor: "part of lifeform" },
    { tag: "part of structure", ancestor: "part" },
    { tag: "part of vehicle", ancestor: "part" },
    { tag: "part of water body", ancestor: "part" },
    { tag: "path", ancestor: "entity" },
    { tag: "imaginary path", ancestor: "path" },
    { tag: "period", ancestor: "entity" },
    { tag: "era", ancestor: "period" },
    { tag: "space", ancestor: "entity" },
    { tag: "area", ancestor: "space" },
    { tag: "administrative area", ancestor: "area" },
    { tag: "facility", ancestor: "area" },
    { tag: "land", ancestor: "area" },
    { tag: "layer", ancestor: "space" },
    { tag: "limit", ancestor: "space" },
    { tag: "position", ancestor: "space" },
    { tag: "system", ancestor: "entity" },
    //Process
    { tag: "process", ancestor: null },
    { tag: "action", ancestor: "process" },
    { tag: "analysis", ancestor: "action" },
    { tag: "chemical reaction", ancestor: "action" },
    { tag: "collection", ancestor: "action" },
    { tag: "interaction", ancestor: "action" },
    { tag: "management", ancestor: "action" },
    { tag: "measure", ancestor: "action" },
    { tag: "protection", ancestor: "action" },
    { tag: "activity", ancestor: "process" },
    { tag: "process", ancestor: "addition" },
    { tag: "change", ancestor: "process" },
    { tag: "change in size/intensity", ancestor: "change" },
    { tag: "decrease", ancestor: "change in size/intensity" },
    { tag: "increase", ancestor: "change in size/intensity" },
    { tag: "change of direction", ancestor: "change" },
    { tag: "change of state", ancestor: "change" },
    { tag: "disease", ancestor: "change" },
    { tag: "division", ancestor: "change" },
    { tag: "transformation", ancestor: "change" },
    { tag: "pollution", ancestor: "transformation" },
    { tag: "restoration", ancestor: "transformation" },
    { tag: "cycle", ancestor: "process" },
    { tag: "elimination", ancestor: "process" },
    { tag: "emission", ancestor: "process" },
    { tag: "formation", ancestor: "process" },
    { tag: "loss", ancestor: "process" },
    { tag: "method", ancestor: "process" },
    { tag: "movement", ancestor: "process" },
    { tag: "earth/soil movement", ancestor: "movement" },
    { tag: "energy movement", ancestor: "movement" },
    { tag: "fluid movement", ancestor: "movement" },
    { tag: "water movement", ancestor: "fluid movement" },
    { tag: "transport", ancestor: "movement" },
    { tag: "wave", ancestor: "movement" },
    { tag: "wind movement", ancestor: "movement" },
    { tag: "phase", ancestor: "process" },
    { tag: "phase of cycle", ancestor: "phase" },
    { tag: "phase of treatment", ancestor: "phase" },
    { tag: "phase of water movement", ancestor: "phase" },
    { tag: "phenomenon", ancestor: "process" },
    { tag: "atmospheric phenomenon", ancestor: "phenomenon" },
    { tag: "precipitation", ancestor: "atmospheric phenomenon" },
    { tag: "optical phenomenon", ancestor: "phenomenon" }
];

const dataSource = new DataSource(config);

dataSource
    .initialize()
    .then(async () => {
        const lexicalDomainRepo = dataSource.getRepository(
            LexicalDomainTagEntity
        );
        const semanticCategoryRepo = dataSource.getRepository(
            SemanticCategoryTagEntity
        );
        const semanticRolesRepo = dataSource.getRepository(
            SemanticRoleTagEntity
        );

        const lexicalDomainTags = LEXICAL_DOMAIN_TAGS.map((tag) =>
            lexicalDomainRepo.create(tag)
        );
        const lexicalDomainPromise = Promise.all(
            lexicalDomainTags.map((tag) => lexicalDomainRepo.save(tag))
        );

        const semanticRoleTags = SEMANTIC_ROLE_TAGS.map((tag) =>
            semanticRolesRepo.create(tag)
        );
        const semanticRolePromise = Promise.all(
            semanticRoleTags.map((tag) => semanticRolesRepo.save(tag))
        );

        await Promise.all([lexicalDomainPromise, semanticRolePromise]);

        //Can't insert semantic categories in parallel as they depend of each other given the self Many-to-One relation
        for (const semTag of SEMANTIC_CATEGORY_TAGS) {
            let ancestorTag: SemanticCategoryTagEntity | null = null;

            if (semTag.ancestor) {
                ancestorTag = await semanticCategoryRepo.findOne({
                    where: { tag: semTag.ancestor }
                });
            }

            const createdSemTag = semanticCategoryRepo.create({
                tag: semTag.tag,
                ancestor: ancestorTag
            });

            await semanticCategoryRepo.save(createdSemTag);
        }

        dataSource.destroy();
        exit(0);
    })
    .catch((err) => {
        console.log("Error!", err);
        exit(-1);
    });
