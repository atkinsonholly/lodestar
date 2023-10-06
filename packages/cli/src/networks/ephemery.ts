import path from "node:path";
import {fileURLToPath} from "node:url";
import {generateGenesis} from "@lodestar/ephemery/genesis";

export {ephemeryChainConfig as chainConfig} from "@lodestar/config/networks";

// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// TODO: link generateGenesis to flag
// eslint-disable-next-line @typescript-eslint/no-unsafe-call
// generateGenesis();

const BASE_OUT_PATH = path.join(__dirname, "../../../ephemery/out/genesis");

export const depositContractDeployBlock = 0;
export const genesisFileUrl = `${BASE_OUT_PATH}/genesis.ssz` || "https://ephemery.dev/latest/genesis.ssz";
export const bootnodesFileUrl = "https://ephemery.dev/latest/bootstrap_nodes.txt";

// Pick from above file
export const bootEnrs = [];
