const express = require('express');
const { ethers, utils } = require('ethers');
const fs = require('fs');
const { join } = require('path');
const app = express();
require('dotenv').config()

app.get("/", async (req, res) => {
    const rawJson = fs.readFileSync(join('./', 'abi.json'), 'utf8');
    const abi = JSON.parse(rawJson);
    const provider = new ethers.providers.JsonRpcProvider(`${process.env.KOVAN_URL}`, 42);

    const contract = new ethers.Contract(
        `${process.env.CONTRACT_ADDRESS}`,
        abi,
        provider);
    
    const goal = await contract.goal();
    
    res.send(utils.formatEther(goal));
})

app.listen(5000, () => {
    console.log("Running on port 5000.");
})

module.export = app;