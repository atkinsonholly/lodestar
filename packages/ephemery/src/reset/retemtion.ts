import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import { exec } from 'child_process';
import axios from 'axios';
import * as tar from 'tar';

const execPromise = util.promisify(exec);

const genesisRepository = 'ephemery-testnet/ephemery-genesis';
const testnetDir = '/home/ethereum/testnet';
const elDataDir = '/home/ethereum/data-geth';
const clDataDir = '/home/ethereum/data-lh';
const clPort = 5052;
const genesisResetInterval = 86400; // 1 day in seconds

async function startClients() {
    console.log('Start clients');
    await execPromise('sudo systemctl start beacon-chain');
    await execPromise('sudo systemctl start validator');
}

async function stopClients() {
    console.log('Stop clients');
    await execPromise('sudo systemctl stop beacon-chain');
    await execPromise('sudo systemctl stop validator');
}

async function clearDataDirs() {
    fs.rmdirSync(path.join(clDataDir, 'beacon'), { recursive: true });
    fs.unlinkSync(path.join(clDataDir, 'validators/slashing_protection.sqlite'));
}

async function setupGenesis() {
    console.log('Setup Genesis');
    // there is actually no setupGenesis function for a consensus client, i wrote this anyway for it.
    await execPromise(`~/lodestar/bin/lodestar init --datadir ${clDataDir} ${path.join(testnetDir, 'genesis.json')}`);
}

async function getGithubRelease(repository: string) {
    try {
        const response = await axios.get(`https://api.github.com/repos/${repository}/releases/latest`);
        return response.data.tag_name;
    } catch (error) {
        console.error('Error fetching GitHub release:', error);
        throw error;
    }
}

async function downloadGenesisRelease(genesisRelease: string) {
    console.log('Download Genesis Release');
    const testnetDirExists = fs.existsSync(testnetDir);
    if (testnetDirExists) {
        fs.rmdirSync(testnetDir);
    }

    fs.mkdirSync(testnetDir, { recursive: true });

    const response = await axios.get(`https://github.com/${genesisRepository}/releases/download/${genesisRelease}/testnet-all.tar.gz`, { responseType: 'stream' });
    response.data.pipe(tar.x({ C: testnetDir }));
    await new Promise((resolve, reject) => {
        response.data.on('end', resolve);
        response.data.on('error', reject);
    });
}

async function resetTestnet(genesisRelease: string) {
    await stopClients();
    clearDataDirs();
    await downloadGenesisRelease(genesisRelease);
    await setupGenesis();
    await startClients();
}

async function checkTestnet() {
    const currentTime = Math.floor(Date.now() / 1000);

    const genesisTimeResponse = await axios.get(`http://localhost:${clPort}/eth/v1/beacon/genesis`);
    const genesisTime = genesisTimeResponse.data.genesis_time;

    if (!genesisTime || genesisTime <= 0) {
        console.error('Could not get genesis time from beacon node');
        return;
    }

    const retentionVarsPath = path.join(testnetDir, 'retention.vars');
    if (!fs.existsSync(retentionVarsPath)) {
        console.error('Could not find retention.vars');
        return;
    }

    const { GENESIS_RESET_INTERVAL, ITERATION_RELEASE, CHAIN_ID } = require(retentionVarsPath);

    const testnetTimeout = genesisTime + GENESIS_RESET_INTERVAL - 300;
    console.log(`Genesis timeout: ${testnetTimeout - currentTime} sec`);

    if (testnetTimeout <= currentTime) {
        const latestGenesisRelease = await getGithubRelease(genesisRepository);

        if (!ITERATION_RELEASE) {
            process.env.ITERATION_RELEASE = CHAIN_ID;
        }

        if (latestGenesisRelease === ITERATION_RELEASE) {
            console.error(`Could not find new genesis release (release: ${latestGenesisRelease})`);
            return;
        }

        await resetTestnet(latestGenesisRelease);
    }
}

async function main() {
    const genesisJsonPath = path.join(testnetDir, 'genesis.json');

    if (!fs.existsSync(genesisJsonPath)) {
        const latestGenesisRelease = await getGithubRelease(genesisRepository);
        await resetTestnet(latestGenesisRelease);
    } else {
        await checkTestnet();
    }
}

