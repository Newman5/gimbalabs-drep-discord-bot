15f82a365bdee483a4b03873a40d3829cc88c048ff3703e11bd01dd9e035c916/0

curl -s https://api.koios.rest/api/v1/gov_actions \
  -H 'content-type: application/json' \
  -d '{"tx_hash":"15f82a365bdee483a4b03873a40d3829cc88c048ff3703e11bd01dd9e035c916","cert_index":0}'


curl https://cardano-mainnet.blockfrost.io/api/v0/governance/proposals/d2db60c5307cb517c735e2d0138d2b6f10fc5b221d610fa187719bdc82af9a03/0/metadata \
  --header 'Project_id: mainnetsqMkdCkNUgu0C0htKZpac5UpE0VoVz1x' \
  -o proposal-metadata.json

  https://gov.tools/governance_actions/d2db60c5307cb517c735e2d0138d2b6f10fc5b221d610fa187719bdc82af9a03#0

```bash
  curl https://cardano-mainnet.blockfrost.io/api/v0/governance/proposals/d2db60c5307cb517c735e2d0138d2b6f10fc5b221d610fa187719bdc82af9a03/0/metadata \
  --header 'Project_id: mainnets...oVz1x' \
  -o proposal-metadata.json
```

```js
import fs from "fs";

const raw = fs.readFileSync("proposal-metadata.json", "utf-8");
const data = JSON.parse(raw);

const title = data.json_metadata.body.title;
const abstract = data.json_metadata.body.abstract;
const actionType = data.json_metadata.body.onChain.governanceActionType;

console.log(`Title: ${title}`);
console.log(`Abstract: ${abstract}`);
console.log(`Type: ${actionType}`);
```