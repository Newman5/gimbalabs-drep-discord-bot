import fs from "fs";

const raw = fs.readFileSync("proposal-metadata.json", "utf-8");
const data = JSON.parse(raw);

const title = data.json_metadata.body.title;
const abstract = data.json_metadata.body.abstract;
const actionType = data.json_metadata.body.onChain.governanceActionType;

console.log(`Title: ${title}`);
console.log(`Abstract: ${abstract}`);
console.log(`Type: ${actionType}`);
