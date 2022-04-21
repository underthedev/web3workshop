const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");
const { smock } = require("@defi-wonderland/smock");
const { utils } = ethers;
const { provider } = waffle;

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
        fundingContract = await SmartFundingContract.deploy(tokenContract.address, "0x4Cb093f226983713164A62138C3F718A5b595F73");
        await fundingContract.deployed();
    })

    it("Should deploy smartfunding", async function () {
        expect(await fundingContract.tokenAddress()).to.equal(tokenContract.address);
        expect(await tokenContract.totalSupply()).to.equal(utils.parseUnits("1000000", decimals));
    });

    it("Should transfer owner token to smart funding contract", async function () {
        expect(await fundingContract.tokenAddress()).to.equal(tokenContract.address);
        expect(await tokenContract.totalSupply()).to.equal(utils.parseUnits("1000000", decimals));

        expect(await tokenContract.balanceOf(owner.address)).to.equal(utils.parseUnits("1000000", decimals));

        // Transfer
        await tokenContract.connect(owner).transfer(fundingContract.address, utils.parseUnits("1000000", decimals));
        expect(await tokenContract.balanceOf(owner.address)).to.equal(utils.parseUnits("0", decimals));
        expect(await tokenContract.balanceOf(fundingContract.address)).to.equal(utils.parseUnits("1000000", decimals));

        // Initialize
        await fundingContract.initialize(utils.parseEther("1"), 7);
        expect(await fundingContract.goal()).to.equal(utils.parseEther("1"));
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

        const SmartFundingContract = await smock.mock("SmartFunding");
        fundingContract = await SmartFundingContract.deploy(tokenContract.address, "0x4Cb093f226983713164A62138C3F718A5b595F73");
        await fundingContract.deployed();

        await tokenContract.connect(owner).transfer(fundingContract.address, utils.parseUnits("1000000", decimals));
        await fundingContract.initialize(utils.parseEther("1"), 7);
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

    it("Should claim reward success", async function() {
        const tx = await fundingContract.connect(investor1).invest({value: utils.parseEther("0.9")});
        await tx.wait();
        const tx1 = await fundingContract.connect(investor2).invest({value: utils.parseEther("0.1")});
        await tx1.wait();
        
        await fundingContract.setVariable('fundingStage', 2);
        const tx2 = await fundingContract.connect(investor2).claim();
        await tx2.wait();

        expect(await fundingContract.claimedOf(investor2.address)).to.equal(true);
        expect(await fundingContract.rewardOf(investor2.address)).to.equal(0);
        expect(tx2).to.emit(fundingContract, "ClaimReward").withArgs(investor2.address, utils.parseUnits("100000", decimals))
        expect(tx2).to.emit(tokenContract, "Transfer").withArgs(fundingContract.address, investor2.address, utils.parseUnits("100000", decimals))

        expect(await tokenContract.balanceOf(investor2.address)).to.equal(utils.parseUnits("100000", decimals));
        expect(await tokenContract.balanceOf(fundingContract.address)).to.equal(utils.parseUnits("900000", decimals));
    })

    it("Should reject claim with no invest", async function() {
        await fundingContract.setVariable('fundingStage', 2);
        const tx = fundingContract.connect(investor1).claim();
        await expect(tx).to.be.revertedWith("No reward");
    })

    it("Should reject claim with already claimed reward", async function() {
        const tx = await fundingContract.connect(investor1).invest({value: utils.parseEther("0.9")});
        await tx.wait();
        await fundingContract.setVariable('fundingStage', 2);
        const tx2 = await fundingContract.connect(investor1).claim();
        await tx2.wait();

        const tx3 = fundingContract.connect(investor1).claim();
        await expect(tx3).to.be.revertedWith("Already claimed");
    })

    it("Should refund success", async function() {
        const tx = await fundingContract.connect(investor1).invest({value: utils.parseEther("0.9")});
        await tx.wait();
        expect(await provider.getBalance(fundingContract.address)).to.equal(utils.parseEther("0.9"))

        await fundingContract.setVariable('fundingStage', 3);
        const tx2 = await fundingContract.connect(investor1).refund();
        await tx2.wait();

        expect(await fundingContract.pool()).to.equal(utils.parseEther("0"));
        expect(await provider.getBalance(fundingContract.address)).to.equal(utils.parseEther("0"))
    })

    it("Should reject invest when no invest or refunded", async function() {
        const tx = await fundingContract.connect(investor1).invest({value: utils.parseEther("0.9")});
        await tx.wait();

        await fundingContract.setVariable('fundingStage', 3);
        const tx2 = await fundingContract.connect(investor1).refund();
        await tx2.wait();

        const tx3 = fundingContract.connect(investor1).refund();
        await expect(tx3).to.be.revertedWith("No invest");
    })

    it("Should calculate normal case success", async function() {
        const result = await fundingContract.calculateReward(utils.parseEther("0.9"));
        expect(result).to.equal(utils.parseUnits("900000", decimals));
    })

    it("Should calculate normal case success", async function() {
        const result = await fundingContract.calculateReward(utils.parseEther("1"));
        expect(result).to.equal(utils.parseUnits("1000000", decimals));
    })

    it("Should calculate over pay case success", async function() {
        const result = await fundingContract.calculateReward(utils.parseEther("2"));
        expect(result).to.equal(utils.parseUnits("1000000", decimals));
    })
});
