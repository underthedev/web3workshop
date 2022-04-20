const { expect } = require("chai");
const { ethers } = require("hardhat");
const { utils } = ethers;

const decimals = 18;

describe("Deploy smart funding contract", function () {
    let owner;
    let tokenContract;
    let fundingContract;

    beforeEach(async function () {
        [owner] = await ethers.getSigners();
        const UTDToken = await ethers.getContractFactory("UTDToken");
        tokenContract = await UTDToken.deploy();
        await tokenContract.deployed();

        const SmartFundingContract = await ethers.getContractFactory("SmartFunding");
        fundingContract = await SmartFundingContract.deploy(tokenContract.address);
        await fundingContract.deployed();
    })

    it("Should deploy smartfunding", async function () {
        expect(await fundingContract.tokenAddress()).to.equal(tokenContract.address);
        expect(await tokenContract.totalSupply()).to.equal(utils.parseUnits("1000000", decimals));
    });

    it("Should transfer owner token to smart funding contract", async function () {
        expect(await fundingContract.tokenAddress()).to.equal(tokenContract.address);
        expect(await tokenContract.totalSupply()).to.equal(utils.parseUnits("1000000", decimals));

        expect(await tokenContract.balanceOf(owner.address)).to.equal(utils.parseUnits("1000000", decimals))

        // Transfer
        await tokenContract.connect(owner).transfer(fundingContract.address, utils.parseUnits("1000000", decimals))
        expect(await tokenContract.balanceOf(owner.address)).to.equal(utils.parseUnits("0", decimals))
        expect(await tokenContract.balanceOf(fundingContract.address)).to.equal(utils.parseUnits("1000000", decimals))

        // Innitialize
        await fundingContract.innitialize(utils.parseEther("1"), 7)
        expect(await fundingContract.goal()).to.equal(utils.parseEther("1"))
    });
});

describe("SmartFunding operations", function () {
    let owner;
    let investor1;
    let investor2;
    let investor3;
    let tokenContract;
    let fundingContract;

    beforeEach(async function () {
        [owner, investor1, investor2, investor3] = await ethers.getSigners();
        const UTDToken = await ethers.getContractFactory("UTDToken");
        tokenContract = await UTDToken.deploy();
        await tokenContract.deployed();

        const SmartFundingContract = await ethers.getContractFactory("SmartFunding");
        fundingContract = await SmartFundingContract.deploy(tokenContract.address);
        await fundingContract.deployed();

        await tokenContract.connect(owner).transfer(fundingContract.address, utils.parseUnits("1000000", decimals))
        await fundingContract.innitialize(utils.parseEther("1"), 7)
    })

    it("Should invest success", async function () {
        const tx = await fundingContract.connect(investor1).invest({value: utils.parseEther("0.1")});
        await tx.wait();
        const tx1 = await fundingContract.connect(investor2).invest({value: utils.parseEther("0.2")});
        await tx1.wait();
        const tx2 = fundingContract.connect(investor3).invest({value: utils.parseEther("0")});
        await expect(tx2).to.be.revertedWith("Reject amount of invest");

        expect(await fundingContract.pool()).to.equal(utils.parseEther("0.3"));
        expect(await fundingContract.investOf(investor1.address)).to.equal(utils.parseEther("0.1"));
        expect(await fundingContract.investOf(investor2.address)).to.equal(utils.parseEther("0.2"));
        expect(tx).to.emit(fundingContract, "Invest").withArgs(investor1.address, utils.parseEther("0.1"));
        expect(tx1).to.emit(fundingContract, "Invest").withArgs(investor2.address, utils.parseEther("0.2"));

        expect(await fundingContract.rewardOf(investor1.address)).to.equals(utils.parseUnits("100000", decimals));
        expect(await fundingContract.rewardOf(investor2.address)).to.equals(utils.parseUnits("200000", decimals));
    })
});
