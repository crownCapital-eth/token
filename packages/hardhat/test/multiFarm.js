 const { ethers } = require("hardhat");
const { use, expect, util } = require("chai");
const { solidity } = require("ethereum-waffle");
const { Contract, utils, BigNumber } = require("ethers");


use(solidity);

async function getCurrentTime() {
  const blockNum = await ethers.provider.getBlockNumber();
  const currentBlock = await ethers.provider.getBlock(blockNum);
  var currentTime = BigNumber.from(currentBlock.timestamp);
  return currentTime;
};

describe("Yield Farm", () => {
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let addrs;

  let tokenContract;
  let vaultContract;
  let FarmContract;

  let vaultTokensSupply;
  let FarmTokensSupply;
  const tolerance = utils.parseEther("0.0001");

  beforeEach(async () => {
    // eslint-disable-next-line no-unused-vars
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    // Deploy Token contract
    TokenContract = await ethers.getContractFactory("CrownToken");
    tokenContract = await TokenContract.deploy();

    // Deploy Vault Contract
    const VaultContract = await ethers.getContractFactory("Vault");
    vaultContract = await VaultContract.deploy(tokenContract.address);

    // Deploy Farm Contract
    const FarmContract = await ethers.getContractFactory("Farm");
    farmContract = await FarmContract.deploy(tokenContract.address, vaultContract.address);

    // Deploy Mock Sushi LP Token
    MockTokenContract = await ethers.getContractFactory("MockSushiLP");
    mockTokenContract = await MockTokenContract.deploy();

    // Deploy Sushi LP Farm Contract
    const MockLPFarmContract = await ethers.getContractFactory("mockLPFarm");
    mockLPFarmContract = await MockLPFarmContract
      .deploy(
        mockTokenContract.address,
        tokenContract.address,
        vaultContract.address);

    // Transfer Tokens
    await tokenContract.transfer(vaultContract.address, ethers.utils.parseEther("75000000"));
    await tokenContract.transfer(owner.address, ethers.utils.parseEther("25000000"));

    // Set the Farm Address
    await vaultContract.initializeFarm(farmContract.address, 50);
    await vaultContract.initializeFarm(mockLPFarmContract.address, 50);
    const secondsIn48Hours = 172800;
    await ethers.provider.send("evm_increaseTime", [secondsIn48Hours]);
    await ethers.provider.send("evm_mine");
    await vaultContract.setFarms();

    // Transfer Ownership
    await vaultContract.transferOwnership(owner.address);
    await farmContract.transferOwnership(owner.address);
    await mockLPFarmContract.transferOwnership(owner.address);

    // Intitialize starting balances
    vaultTokensSupply = await tokenContract.balanceOf(vaultContract.address);
    farmTokensSupply = await tokenContract.balanceOf(farmContract.address);
    ownerTokenSupply = await tokenContract.balanceOf(owner.address);
  });

  describe("Multifarm", () => {
    it("Per farm seconds per token", async () => {
      // ACTION: Initialize 
      const stakeAmount = 100;
      const farm1Percent = await vaultContract.getActiveFarmPercents(farmContract.address);
      const farm2Percent = await vaultContract.getActiveFarmPercents(mockLPFarmContract.address);
      // CHECK: Sum of per farm emissions equals total emissions
      // NOTE: Seconds per token is inversly proportional to % of farm
      const vaultSecondsPerToken = await vaultContract.secondsPerToken();
      const farm1SecondsPerToken = await vaultContract.getFarmSecondsPerToken(farmContract.address);
      const farm2SecondsPerToken = await vaultContract.getFarmSecondsPerToken(mockLPFarmContract.address);
      expect(farm1SecondsPerToken).to.equal(vaultSecondsPerToken.mul(100).div(farm1Percent));
      expect(farm2SecondsPerToken).to.equal(vaultSecondsPerToken.mul(100).div(farm2Percent));
    });

    it("1 user multifarm", async () => {
      // ACTION: Initialize 
      const stakeAmount = 100;
      const farm1Percent = await vaultContract.getActiveFarmPercents(farmContract.address);
      const farm2Percent = await vaultContract.getActiveFarmPercents(mockLPFarmContract.address);
      // ACTION: Transfer tokens & approve contract
      await tokenContract.transfer(addr1.address, stakeAmount);
      await tokenContract.connect(addr1).approve(farmContract.address, stakeAmount);
      await mockTokenContract.transfer(addr1.address, stakeAmount);
      await mockTokenContract.connect(addr1).approve(mockLPFarmContract.address, stakeAmount);
      // ACTION: Stake to Farm 1 & 2
      await farmContract.connect(addr1).stake(stakeAmount);
      var t0 = await getCurrentTime();
      await mockLPFarmContract.connect(addr1).stake(stakeAmount);
      // ACTION: Unstake from farm 1 & 2
      await farmContract.connect(addr1).unstake(stakeAmount);
      var t_end = await getCurrentTime();
      await mockLPFarmContract.connect(addr1).unstake(stakeAmount);

      // CHECK: Farm 1 & Farm 2 Yield
      const secondsStaking = t_end - t0;
      const farm1Yield = await farmContract.getCrownYield(addr1.address);
      const farm2Yield = await mockLPFarmContract.getCrownYield(addr1.address);
      tps = await vaultContract.tokensPerSecond();
      expect(farm1Yield).to.equal(tps.mul(secondsStaking).mul(farm1Percent).div(100));
      expect(farm2Yield).to.equal(tps.mul(secondsStaking).mul(farm2Percent).div(100));
    });

    it("1 farm set to 0 percent", async () => {
      // ACTION: Initialize 
      const stakeAmount = 50;
      const farm1Percent = 0;
      const farm2Percent = 100;
      // ACTION: set farms
      await vaultContract.initializeFarm(farmContract.address, farm1Percent);
      await vaultContract.initializeFarm(mockLPFarmContract.address, farm2Percent);
      const secondsIn48Hours = 172800;
      await ethers.provider.send("evm_increaseTime", [secondsIn48Hours]);
      await ethers.provider.send("evm_mine");
      await vaultContract.setFarms();
      // Stake
      await tokenContract.transfer(addr1.address, stakeAmount);
      await tokenContract.connect(addr1).approve(farmContract.address, stakeAmount);
      await mockTokenContract.transfer(addr1.address, stakeAmount);
      await mockTokenContract.connect(addr1).approve(mockLPFarmContract.address, stakeAmount);
      // ACTION: Stake to Farm 1 & 2
      await farmContract.connect(addr1).stake(stakeAmount);
      // CHECK: Does not revert
      expect(await farmContract.connect(addr1).unstake(stakeAmount)).to.be.ok;
    });

    it("1 user withdraw balances", async () => {
      // ACTION: Initialize 
      const stakeAmount = 100;
      // ACTION: Transfer tokens & approve contract
      await tokenContract.transfer(addr1.address, stakeAmount);
      await tokenContract.connect(addr1).approve(farmContract.address, stakeAmount);
      await mockTokenContract.transfer(addr1.address, stakeAmount);
      await mockTokenContract.connect(addr1).approve(mockLPFarmContract.address, stakeAmount);
      // ACTION: Stake to Farm 1 & 2
      await farmContract.connect(addr1).stake(stakeAmount);
      var t0 = await getCurrentTime();
      await mockLPFarmContract.connect(addr1).stake(stakeAmount);
      // ACTION: Unstake from farm 1 & 2
      await farmContract.connect(addr1).unstake(stakeAmount);
      var t_end = await getCurrentTime();
      await mockLPFarmContract.connect(addr1).unstake(stakeAmount);
      const farm1Yield = await farmContract.getCrownYield(addr1.address);
      const farm2Yield = await mockLPFarmContract.getCrownYield(addr1.address);
      // ACTION: Withdraw Farm 1 Yield
      await farmContract.connect(addr1).withdrawYield();
      // CHECK: Token Balance
      const tokenBalance1 = await tokenContract.balanceOf(addr1.address);
      expect(tokenBalance1.sub(stakeAmount)).to.equal(farm1Yield);
      // ACTION: Withdraw Farm 1 Yield
      await mockLPFarmContract.connect(addr1).withdrawYield();
      const tokenBalance2 = await tokenContract.balanceOf(addr1.address);
      // CHECK: Withdrew Correct Yield
      expect(tokenBalance2.sub(tokenBalance1)).to.equal(farm2Yield);
    });

  });

});
