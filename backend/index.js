const express = require('express');
const { ethers, utils } = require('ethers');
const fs = require('fs');
const { join } = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use((req, res, next) => {
    const rawJson = fs.readFileSync(join('./', 'abi.json'), 'utf8');
    const abi = JSON.parse(rawJson);
    const provider = new ethers.providers.JsonRpcProvider(`${process.env.KOVAN_URL}`, 42);
    const signer = new ethers.Wallet(`${process.env.PRIVATE_KEY}`, provider)
    const contract = new ethers.Contract(
        `${process.env.CONTRACT_ADDRESS}`,
        abi,
        signer);

    req.contract = contract;
    next();
})

app.get("/", async (req, res) => {
    const contract = req.contract;
    
    const goalTask = contract.goal().then(res => utils.formatEther(res));
    const poolTask = contract.pool().then(res => utils.formatEther(res));
    const endTimeTask = contract.endTime().then(res => res * 1000);

    const [goal, pool, endTime] = [await goalTask, await poolTask, await endTimeTask];
    const progress = ((pool / goal) * 100).toPrecision(4);

    res.json({goal, pool, endTime, progress});
})

app.get("/pause", async (req, res) => {
    const contract = req.contract;
    const tx = await contract.pause();
    res.json({txHash: tx.hash});
})

app.get("/unpause", async (req, res) => {
    const contract = req.contract;
    const tx = await contract.unpause();
    res.json({txHash: tx.hash});
})

app.listen(5000, () => {
    console.log("Running on port 5000.");
})

module.export = app;