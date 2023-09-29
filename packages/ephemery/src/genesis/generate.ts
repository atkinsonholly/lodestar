import fs from "node:fs";
import got from "got";
// import path from "node:path";
import {toHexString} from "@chainsafe/ssz";
import {ephemeryChainConfig} from "@lodestar/config/networks";
import {chainConfigToJson} from "@lodestar/config";

// Script to generate ephemery testnet genesis for the current testnet iteration
// This generated genesis may be used by the client to verify parameters in the downloaded state and issue an error if values don’t correspond

// import * as validators from "./validators.json";

// TODO: get validators from github
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

const BASE_OUT_PATH = "./out/genesis";
const validatorsBaseFileUrl = "https://raw.githubusercontent.com/ephemery-testnet/ephemery-genesis/master/validators";
const depositContractBlock = "0";
const clExecBlock = "0x0000000000000000000000000000000000000000000000000000000000000000";

export const generateGenesis: () => void = () => {
  fs.mkdirSync(BASE_OUT_PATH, {recursive: true});
  fs.writeFileSync(`${BASE_OUT_PATH}/config.json`, JSON.stringify(chainConfigToJson(ephemeryChainConfig)));

  // TODO: verify whether this needs to be hex or not
  fs.writeFileSync(`${BASE_OUT_PATH}/deposit_contract.txt`, toHexString(ephemeryChainConfig.DEPOSIT_CONTRACT_ADDRESS));
  fs.writeFileSync(`${BASE_OUT_PATH}/deploy_block.txt`, depositContractBlock);
  fs.writeFileSync(`${BASE_OUT_PATH}/deposit_contract_block.txt`, clExecBlock);

  // Create a dummy validator with iteration number in pubkey (required to get a unique forkdigest for each genesis iteration)

  const iteration: number = ephemeryChainConfig.DEPOSIT_NETWORK_ID - 39438000; // 39438000 is the DEPOSIT_NETWORK_ID for the first iteration

  const validatorSet = "";
  validators.map(async (validator) => {
    // TODO: error handling
    const validatorFile = await got.get(`${validatorsBaseFileUrl}/${validator}.txt`).text();
    // TODO: parse validatorFile
    validatorSet.concat(validatorFile, "\n");
  });

  // TODO: check where pubkey comes from
  const dummyAddress = `0xb54b2811832ff970d1b3e048271e4fc9c0f4dcccac17683724f972203a6130d8ee7c26ec9bde0183fcede171deaddc4b:0x010000000000000000000000${iteration}:16000000000`;
  validatorSet.concat(dummyAddress, " ");
  fs.writeFileSync(`${BASE_OUT_PATH}/validators.txt`, validatorSet);

  // TODO:
  // generate genesis:
  // eth2-testnet-genesis capella \
  //         --config ./dist/config.yaml \
  //         --additional-validators $tmp_dir/validators.txt \
  //         --eth1-config ./dist/genesis.json \
  //         --tranches-dir ./dist/tranches \
  //         --state-output ./dist/genesis.ssz
};

generateGenesis();
