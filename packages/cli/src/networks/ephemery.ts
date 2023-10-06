import path from "node:path";
import {generateGenesis} from "@lodestar/ephemery/genesis";

export {ephemeryChainConfig as chainConfig} from "@lodestar/config/networks";

export const depositContractDeployBlock = 0;

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
generateGenesis();

const BASE_OUT_PATH = path.join(__dirname, "../../out/genesis");

export const genesisFileUrl = `${BASE_OUT_PATH}/genesis.ssz`; // || "https://ephemery.dev/latest/genesis.ssz";
export const bootnodesFileUrl = "https://ephemery.dev/latest/bootstrap_nodes.txt";

// Pick from above file
export const bootEnrs = [];
