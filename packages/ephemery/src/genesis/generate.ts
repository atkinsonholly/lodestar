import fs from "node:fs";
import path from "node:path";
import {writeFile} from "node:fs/promises";
import child from "node:child_process";
import {fileURLToPath} from "node:url";
import got from "got";
import * as util from "util";
import yaml from "js-yaml";
import {toHexString} from "@chainsafe/ssz";
import {ephemeryChainConfig} from "@lodestar/config/networks";
import {chainConfigToJson} from "@lodestar/config";

const execPromise = util.promisify(child.exec);

// Script to generate ephemery testnet genesis for the current testnet iteration
// This generated genesis may be used by the client to verify parameters in the downloaded state and issue an error if values don’t correspond

// TODO: get validators dynamically
const validators = [
  "laibe-node1",
  "mario-node1",
  "mario-node2",
  "pk910-node1",
  "pk910-node2",
  "pk910-node3",
  "pk910-node5",
  "remyroy-node1",
  "remyroy-node2",
];

// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PATH_TO_GENESIS_STATE_CREATOR = path.join(__dirname, "../../../../../eth2-testnet-genesis/");
const BASE_OUT_PATH = path.join(__dirname, "../../out/genesis");
const RELATIVE_OUT_PATH = "../../out/genesis";
const validatorsBaseFileUrl = "https://raw.githubusercontent.com/ephemery-testnet/ephemery-genesis/master/validators";
const depositContractBlock = "0";
const clExecBlock = "0x0000000000000000000000000000000000000000000000000000000000000000";

export const generateGenesis: () => void = async () => {
  fs.mkdirSync(BASE_OUT_PATH, {recursive: true});

  // write yaml config to out dir
  await writeFile(path.join(BASE_OUT_PATH, "config.yaml"), yaml.dump(chainConfigToJson(ephemeryChainConfig)));

  // write txt file to out dir
  // TODO: verify whether this needs to be hex or not
  fs.writeFileSync(`${BASE_OUT_PATH}/deposit_contract.txt`, toHexString(ephemeryChainConfig.DEPOSIT_CONTRACT_ADDRESS));
  fs.writeFileSync(`${BASE_OUT_PATH}/deploy_block.txt`, depositContractBlock);
  fs.writeFileSync(`${BASE_OUT_PATH}/deposit_contract_block.txt`, clExecBlock);

  // create a dummy validator with iteration number in pubkey (required to get a unique forkdigest for each genesis iteration)
  const iteration: number = ephemeryChainConfig.DEPOSIT_NETWORK_ID - 39438000; // 39438000 is the DEPOSIT_NETWORK_ID for the first iteration

  fs.writeFileSync(`${BASE_OUT_PATH}/validators.txt`, "");
  for (const validator of validators) {
    // TODO: error handling
    const validatorFile = await got.get(`${validatorsBaseFileUrl}/${validator}.txt`).text();
    fs.appendFileSync(`${BASE_OUT_PATH}/validators.txt`, validatorFile);
  }

  // TODO: check where pubkey comes from
  const dummyAddress = `0xb54b2811832ff970d1b3e048271e4fc9c0f4dcccac17683724f972203a6130d8ee7c26ec9bde0183fcede171deaddc4b:0x010000000000000000000000${iteration}:16000000000 \n`;
  fs.appendFileSync(`${BASE_OUT_PATH}/validators.txt`, dummyAddress);

  // calculate genesis state, requires eth2-testnet-genesis by @protolambda, https://github.com/protolambda/eth2-testnet-genesis
  // TODO: get eth1 config
  // TODO: error handling
  await execPromise(
    `${PATH_TO_GENESIS_STATE_CREATOR}./eth2-testnet-genesis capella \
            --config ${BASE_OUT_PATH}/config.yaml \
            --additional-validators ${BASE_OUT_PATH}/validators.txt \
            --eth1-config ${BASE_OUT_PATH}/genesis.json \
            --tranches-dir ${BASE_OUT_PATH}/tranches \
            --state-output ${BASE_OUT_PATH}/genesis.ssz`
  );
};

generateGenesis();
