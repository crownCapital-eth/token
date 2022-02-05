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

    // Transfer Tokens
    await tokenContract.transfer(vaultContract.address, ethers.utils.parseEther("75000000"));
    await tokenContract.transfer(owner.address, ethers.utils.parseEther("25000000"));

    // Set the Farm Address
    await vaultContract.initializeFarm(farmContract.address, 100);
    await vaultContract.setFarms();

    // Transfer Ownership
    await vaultContract.transferOwnership(owner.address);
    await farmContract.transferOwnership(owner.address);

    // Intitialize starting balances
    vaultTokensSupply = await tokenContract.balanceOf(vaultContract.address);
    farmTokensSupply = await tokenContract.balanceOf(farmContract.address);
    ownerTokenSupply = await tokenContract.balanceOf(owner.address);
  });

  describe("Anyone can call", () => {
    it("stake()", async () => {
      const stakeAmount = 100;
      await tokenContract.transfer(addr1.address, stakeAmount);
      await tokenContract.connect(addr1)
        .approve(farmContract.address, stakeAmount);
      expect(await farmContract.connect(addr1).stake(stakeAmount))
        .to.be.ok;
    });

    it("unstake()", async () => {
      const stakeAmount = 100;
      await tokenContract.transfer(addr1.address, stakeAmount);
      await tokenContract.connect(addr1)
        .approve(farmContract.address, stakeAmount);
      await farmContract.connect(addr1).stake(stakeAmount);
      expect(await farmContract.connect(addr1).unstake(stakeAmount))
        .to.be.ok;
    });

    it("withdrawYield()", async () => {
      const stakeAmount = 100;
      await tokenContract.transfer(addr1.address, stakeAmount);
      await tokenContract.connect(addr1)
        .approve(farmContract.address, stakeAmount);
      await farmContract.connect(addr1).stake(stakeAmount);
      await farmContract.connect(addr1).unstake(stakeAmount);
      expect(await farmContract.connect(addr1).withdrawYield())
        .to.be.ok;
    });

    it("userStakingPercent()", async () => {
      expect(await farmContract.connect(addr1).userStakingPercent(addr1.address))
        .to.be.ok;
    });

    it("calculateUserTotalYield()", async () => {
      expect(await farmContract.connect(addr1).calculateUserTotalYield(addr1.address))
        .to.be.ok;
    });

    it("calculateYieldTime()", async () => {
      expect(await farmContract.connect(addr1).calculateYieldTime())
        .to.be.ok;
    });

    it("getStakers()", async () => {
      expect(await farmContract.connect(addr1).getStakers())
        .to.be.ok;
    });

    it("getUserBalance()", async () => {
      expect(await farmContract.connect(addr1).getUserBalance(addr1.address))
        .to.be.ok;
    });

    it("getCrownYield()", async () => {
      expect(await farmContract.connect(addr1).getCrownYield(addr1.address))
        .to.be.ok;
    });

    // PRIVATE: removeAddress
    // PRIVATE: updateYield
  });

  describe("Check Farm Balance", () => {
    it("Initial value is 0", async () => {
      // CHECK: Initial balance
      const balance = await tokenContract.balanceOf(farmContract.address);
      expect(utils.formatEther(balance)).to.equal("0.0");
    });
  });

  describe("Does not fail after 5-years", () => {
    it('stake', async () => {
      // ACTION: Define Amounts and stake
      stakeAmount = ethers.utils.parseEther("50");
      await tokenContract.approve(farmContract.address, stakeAmount);
      await farmContract.stake(stakeAmount);      
      // NOTE: Seconds in 5 year: 5*365*24*3600 = 157,680,000
      const greaterThanSecondsIn5Years = 200000000;
      // ACTION: Increase time
      await ethers.provider.send("evm_increaseTime", [greaterThanSecondsIn5Years]);
      await ethers.provider.send("evm_mine");
      // CHECK: stake, withdraw yield, unstake after 5 years
      expect(await farmContract.unstake(stakeAmount)).to.be.ok;
      expect( await farmContract.withdrawYield()).to.be.ok;
      await expect( farmContract.stake(stakeAmount)).to.be.revertedWith("Emissions from the vault have concluded.");
    });


      it('Ensure sendToFarm ok after 5 years', async () => {
        // ACTION: Define Amounts and stake
        staker1Amount = ethers.utils.parseEther("50");
        staker2Amount = ethers.utils.parseEther("150");
        tokenContract.transfer(addr1.address, staker2Amount);
        await tokenContract.approve(farmContract.address, staker1Amount);
        await tokenContract.connect(addr1).approve(farmContract.address, staker2Amount);
        await farmContract.stake(staker1Amount);
        await farmContract.connect(addr1).stake(staker2Amount); 
        // NOTE: Seconds in 5 year: 5*365*24*3600 = 157,680,000
        const greaterThanSecondsIn5Years = 200000000;
        // ACTION: Increase time
        await ethers.provider.send("evm_increaseTime", [greaterThanSecondsIn5Years]);
        await ethers.provider.send("evm_mine");
        // CHECK: stake, withdraw yield, unstake after 5 years
        expect(await farmContract.unstake(staker1Amount)).to.be.ok;
        expect(await farmContract.connect(addr1).unstake(staker2Amount)).to.be.ok;
        expect(await vaultContract.sendToFarm()).to.be.ok;
      }); 

  });

  describe("stake()", () => {
    it("Revert: Cannot Stake 0 tokens", async () => {
      // ACTION: Define Amounts
      stakeAmount = ethers.utils.parseEther("0");
      // CHECK: Reverts
      await expect(farmContract.stake(stakeAmount))
        .to.be.revertedWith("You cannot stake zero tokens.");
    });

    it("Revert: Insuffcient Balance", async () => {
      // ACTION: Define Amounts
      stakeAmount = ethers.utils.parseEther("100");
      greaterThanBalance = ethers.utils.parseEther("101");
      await tokenContract.transfer(addr1.address, stakeAmount);
      greaterThanBalance = ethers.utils.parseEther("101");
      await tokenContract.connect(addr1)
        .approve(farmContract.address, greaterThanBalance);
      // CHECK: Reverts
      await expect(farmContract.connect(addr1).stake(greaterThanBalance))
        .to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("Stake Emit Event", async () => {
      stakeAmount = ethers.utils.parseEther("100");
      await tokenContract.approve(farmContract.address, stakeAmount);
      await expect(farmContract.stake(stakeAmount))
        .to.emit(farmContract, "Stake")
        .withArgs(owner.address, stakeAmount);
    });

    it("1 Staker Deposit", async () => {
      // ACTION: Define Amounts
      stakeAmount = ethers.utils.parseEther("50");
      // ACTION: Stake tokens
      await tokenContract.approve(farmContract.address, stakeAmount);
      await farmContract.stake(stakeAmount);
      // CHECK: Staker is staking
      const isStaking = await farmContract.isUserStaking(owner.address);
      expect(isStaking).to.equal(true);
      // CHECK: Staker balance
      const stakerBalance = await farmContract.getUserBalance(owner.address);
      expect(stakerBalance).to.equal(stakeAmount);
      // CHECK: Farm balance (totalStaked)
      const farmBalance = await farmContract.totalStaked();
      expect(farmBalance).to.equal(stakeAmount);
      // CHECK: Active staker array
      var stakers = await farmContract.getStakers();
      expect(stakers[0]).to.equal(owner.address);
      expect(stakers.length).to.equal(1);
    });

    it("2 Staker Deposit", async () => {
      // ACTION: Define Amounts
      staker1Amount = ethers.utils.parseEther("50");
      staker2Amount = ethers.utils.parseEther("150");
      stakedTotal = ethers.utils.parseEther("200");
      tokenContract.transfer(addr1.address, staker2Amount);
      // ACTION: Stake tokens
      await tokenContract.approve(farmContract.address, staker1Amount);
      await tokenContract.connect(addr1).approve(farmContract.address, staker2Amount);
      await farmContract.stake(staker1Amount);
      await farmContract.connect(addr1).stake(staker2Amount);
      // CHECK: Staker balance
      const staker1Balance = await farmContract.getUserBalance(owner.address);
      const staker2Balance = await farmContract.getUserBalance(addr1.address);
      const farmBalance = await farmContract.totalStaked();
      expect(staker1Balance).to.equal(staker1Amount);
      expect(staker2Balance).to.equal(staker2Amount);
      expect(staker1Balance.add(staker2Balance)).to.equal(farmBalance);
    });
  });

  describe("unstake()", () => {
    it("Unstake Emit Event", async () => {
      stakeAmount = ethers.utils.parseEther("100");
      await tokenContract.approve(farmContract.address, stakeAmount);
      await farmContract.stake(stakeAmount);
      await expect(farmContract.unstake(stakeAmount))
        .to.emit(farmContract, "Unstake")
        .withArgs(owner.address, stakeAmount);
    });

    it("Revert: Cannot unstake 0 tokens", async () => {
      // ACTION: Define Amounts
      stakeAmount = ethers.utils.parseEther("0");
      // CHECK: Reverts
      await expect(farmContract.unstake(stakeAmount))
        .to.be.revertedWith("You cannot unstake zero tokens.");
    });

    it("Revert: Cannot unstake if not staking", async () => {
      // ACTION: Define Amounts
      stakeAmount = ethers.utils.parseEther("1");
      // CHECK: Reverts
      await expect(farmContract.unstake(stakeAmount))
        .to.be.revertedWith("Requested withdraw greater than staking balance.");
    });

    it("Revert: Cannot unstake more than staking", async () => {
      // ACTION: Define Amounts
      stakeAmount = ethers.utils.parseEther("100");
      greaterThanStakeAmount = stakeAmount.add(1);
      await tokenContract.approve(farmContract.address, stakeAmount);
      await farmContract.stake(stakeAmount);
      // CHECK: Reverts
      await expect(farmContract.unstake(greaterThanStakeAmount))
        .to.be.revertedWith("Requested withdraw greater than staking balance.");
    });

    it("1 Staker Unstakes", async () => {
      // ACTION: Initialize case
      stakeAmount = ethers.utils.parseEther("50");
      // ACTION: Stake tokens then unstake
      await tokenContract.approve(farmContract.address, stakeAmount);
      await farmContract.stake(stakeAmount);
      await farmContract.unstake(stakeAmount);
      // CHECK: Staker is not staking
      const isStaking = await farmContract.isUserStaking(owner.address);
      expect(isStaking).to.equal(false);
      // CHECK: Staker balance
      const stakerBalance = await farmContract.getUserBalance(owner.address);
      expect(stakerBalance).to.equal(0);
      // CHECK: Farm balance (totalStaked)
      const farmBalance = await farmContract.totalStaked();
      expect(farmBalance).to.equal(0);
      // CHECK: Active staker array
      var stakers = await farmContract.getStakers();
      expect(stakers[0]).to.equal();
      expect(stakers.length).to.equal(0);
    });

    it("2 Stakers. 1 Unstakes.", async () => {
      // ACTION: Initialize Case
      staker1Amount = ethers.utils.parseEther("50");
      staker2Amount = ethers.utils.parseEther("75");
      stakedTotal = staker1Amount.add(staker2Amount);
      tokenContract.transfer(addr1.address, staker2Amount);
      // ACTION: Approve and stake
      await tokenContract.approve(farmContract.address, staker1Amount);
      await tokenContract.connect(addr1).approve(farmContract.address, staker2Amount);
      await farmContract.stake(staker1Amount);
      await farmContract.connect(addr1).stake(staker2Amount);
      // ACTION: Unstake
      await farmContract.unstake(stakeAmount);
      // CHECK: Staker is not staking
      const isStaking1 = await farmContract.isUserStaking(owner.address);
      const isStaking2 = await farmContract.isUserStaking(addr1.address);
      expect(isStaking1).to.equal(false);
      expect(isStaking2).to.equal(true);
      // CHECK: Staker balance
      const staker1Balance = await farmContract.getUserBalance(owner.address);
      const staker2Balance = await farmContract.getUserBalance(addr1.address);
      expect(staker1Balance).to.equal(0);
      expect(staker2Balance).to.equal(staker2Amount);
      // CHECK: Farm balance (totalStaked)
      const farmBalance = await farmContract.totalStaked();
      expect(farmBalance).to.equal(staker2Amount);
      // CHECK: Active staker array
      var stakers = await farmContract.getStakers();
      expect(stakers[0]).to.equal(addr1.address);
      expect(stakers.length).to.equal(1);
    });


    it("3 Stakers. 1 Unstakes all. 2 Unstakes some", async () => {
      // ACTION: Initialize Case
      staker1Amount = ethers.utils.parseEther("50");
      staker2Amount = ethers.utils.parseEther("75");
      staker3Amount = ethers.utils.parseEther("100");
      staker2UnstakeAmount = ethers.utils.parseEther("40");
      stakedTotal = staker1Amount.add(staker2Amount).add(staker3Amount);
      tokenContract.transfer(addr1.address, staker2Amount);
      tokenContract.transfer(addr2.address, staker3Amount);
      // ACTION: Approve and stake
      await tokenContract.approve(farmContract.address, staker1Amount);
      await tokenContract.connect(addr1).approve(farmContract.address, staker2Amount);
      await tokenContract.connect(addr2).approve(farmContract.address, staker3Amount);
      await farmContract.stake(staker1Amount);
      await farmContract.connect(addr1).stake(staker2Amount);
      await farmContract.connect(addr2).stake(staker3Amount);
      // ACTION: Unstake
      await farmContract.unstake(staker1Amount);
      await farmContract.connect(addr1).unstake(staker2UnstakeAmount);
      // CHECK: Active stakers
      const isStaking1 = await farmContract.isUserStaking(owner.address);
      const isStaking2 = await farmContract.isUserStaking(addr1.address);
      const isStaking3 = await farmContract.isUserStaking(addr2.address);
      expect(isStaking1).to.equal(false);
      expect(isStaking2).to.equal(true);
      expect(isStaking3).to.equal(true);
      // CHECK: Staker balance
      const staker1Balance = await farmContract.getUserBalance(owner.address);
      const staker2Balance = await farmContract.getUserBalance(addr1.address);
      const staker3Balance = await farmContract.getUserBalance(addr2.address);
      expect(staker1Balance).to.equal(0);
      expect(staker2Balance).to.equal(staker2Amount.sub(staker2UnstakeAmount));
      expect(staker3Balance).to.equal(staker3Amount);
      // CHECK: Farm balance (totalStaked)
      const farmBalance = await farmContract.totalStaked();
      expect(farmBalance)
        .to.equal(staker2Amount.sub(staker2UnstakeAmount).add(staker3Amount));
      // CHECK: Active staker array
      var stakers = await farmContract.getStakers();
      expect(stakers[0]).to.equal(addr2.address);
      expect(stakers[1]).to.equal(addr1.address);
      expect(stakers.length).to.equal(2);
    });

    it("3 Stakers. All Unstake", async () => {
      // ACTION: Initialize Case
      staker1Amount = ethers.utils.parseEther("50");
      staker2Amount = ethers.utils.parseEther("75");
      staker3Amount = ethers.utils.parseEther("100");
      stakedTotal = staker1Amount.add(staker2Amount).add(staker3Amount);
      tokenContract.transfer(addr1.address, staker2Amount);
      tokenContract.transfer(addr2.address, staker3Amount);
      // ACTION: Approve and stake
      await tokenContract.approve(farmContract.address, staker1Amount);
      await tokenContract.connect(addr1).approve(farmContract.address, staker2Amount);
      await tokenContract.connect(addr2).approve(farmContract.address, staker3Amount);
      await farmContract.stake(staker1Amount);
      await farmContract.connect(addr1).stake(staker2Amount);
      await farmContract.connect(addr2).stake(staker3Amount);
      // ACTION: Unstake
      await farmContract.unstake(staker1Amount);
      await farmContract.connect(addr1).unstake(staker2Amount);
      await farmContract.connect(addr2).unstake(staker3Amount);
      // CHECK: Active stakers
      const isStaking1 = await farmContract.isUserStaking(owner.address);
      const isStaking2 = await farmContract.isUserStaking(addr1.address);
      const isStaking3 = await farmContract.isUserStaking(addr2.address);
      expect(isStaking1).to.equal(false);
      expect(isStaking2).to.equal(false);
      expect(isStaking3).to.equal(false);
      // CHECK: Staker balance
      const staker1Balance = await farmContract.getUserBalance(owner.address);
      const staker2Balance = await farmContract.getUserBalance(addr1.address);
      const staker3Balance = await farmContract.getUserBalance(addr2.address);
      expect(staker1Balance).to.equal(0);
      expect(staker2Balance).to.equal(0);
      expect(staker3Balance).to.equal(0);
      // CHECK: Farm balance (totalStaked)
      const farmBalance = await farmContract.totalStaked();
      expect(farmBalance).to.equal(0);
      // CHECK: Active staker array
      var stakers = await farmContract.getStakers();
      expect(stakers.length).to.equal(0);
    });
  });

  describe("Yield: calculateUserTotalYield() and crownYield()", () => {
    it("Not staking Total Yield", async () => {
      // CHECK: Non-staker Yield
      const yield = await farmContract.calculateUserTotalYield(owner.address);
      expect(yield).to.equal(0);
    });

    it("Not staking Crown Yield", async () => {
      // CHECK: Non-staker Yield
      const yield = await farmContract.getCrownYield(owner.address);
      expect(yield).to.equal(0);
    });

    it("1 Staker Yield", async () => {
      // ACTION: Intialize case
      stakeAmount = ethers.utils.parseEther("50");
      const tokensPerSecond = await vaultContract.tokensPerSecond();
      const expectedEmissions = utils.formatEther(tokensPerSecond);
      // ACTION: Approve and stake
      await tokenContract.approve(farmContract.address, stakeAmount);
      await farmContract.stake(stakeAmount);
      // ACTION: Increase time
      const seconds = 1;
      await ethers.provider.send("evm_increaseTime", [seconds]);
      await ethers.provider.send("evm_mine");
      // CHECK: 1 Staker Yield
      const yield = await farmContract.calculateUserTotalYield(owner.address);
      expect(utils.formatEther(yield)).to.equal(expectedEmissions);
    });

    it("Equals crownYield after withdraw", async () => {
      // ACTION: Intialize case
      stakeAmount = ethers.utils.parseEther("50");
      const tokensPerSecond = await vaultContract.tokensPerSecond();
      const expectedEmissions = utils.formatEther(tokensPerSecond);
      // ACTION: Approve and stake
      await tokenContract.approve(farmContract.address, stakeAmount);
      await farmContract.stake(stakeAmount);
      // ACTION: Increase time
      const seconds = 1;
      await ethers.provider.send("evm_increaseTime", [seconds]);
      await ethers.provider.send("evm_mine");
      // CHECK: Yield
      var yield = await farmContract.calculateUserTotalYield(owner.address);
      expect(utils.formatEther(yield)).to.equal(expectedEmissions);
      // ACTION: Withdraw
      await farmContract.unstake(stakeAmount);
      var totalYield = await farmContract.calculateUserTotalYield(owner.address);
      var crownYield = await farmContract.getCrownYield(owner.address);
      expect(crownYield).to.equal(totalYield);
    });

  });

  describe("withdrawYield()", () => {
    it("Reverts: No yield to withdarw", async () => {
      await expect(farmContract.withdrawYield())
        .to.be.revertedWith("Nothing to withdraw");
    });

    it("Emits Event", async () => {
      const tokensPerSecond = await vaultContract.tokensPerSecond();
      stakeAmount = ethers.utils.parseEther("100");
      await tokenContract.approve(farmContract.address, stakeAmount);
      await farmContract.stake(stakeAmount);
      await farmContract.unstake(stakeAmount);
      await expect(farmContract.withdrawYield())
        .to.emit(farmContract, "YieldWithdraw")
        .withArgs(owner.address, tokensPerSecond);
    });


    it("1 Staker Final Balance", async () => {
      // ACTION: Intialize case
      initialBalance = await tokenContract.balanceOf(owner.address);
      stakeAmount = ethers.utils.parseEther("50");
      const tokensPerSecond = await vaultContract.tokensPerSecond();
      const expectedEmissions = tokensPerSecond;
      // ACTION: Approve, stake, unstake, withdraw
      await tokenContract.approve(farmContract.address, stakeAmount);
      await farmContract.stake(stakeAmount);
      await farmContract.unstake(stakeAmount);
      await farmContract.withdrawYield();
      // CHECK: Balance
      finalBalance = await tokenContract.balanceOf(owner.address);
      expect(finalBalance).to.equal(initialBalance.add(expectedEmissions));
      // Check: Yield
      const yield = await farmContract.calculateUserTotalYield(owner.address);
      expect(yield).to.equal(0);
    });
  });

  describe("Full cycle: Stake, unstake, Claim Yield", () => {
    it("2 Staker Yield 50/50", async () => {
      /*=================================================
      This will have 2 users stake 50/50.
      1. User 1 stakes, 
      2. 1 second passes, User 2 stakes 
      3. 1 second passes, User 1 unstakes 
      4. 1 second passes, User 2 unstakes 

      The total staking time is 3 seconds. Each users stakes for
      1 second solo and for 1 second 50/50 split. Therefor each 
      user should expect: 
      ~2.1024 Tokens/second * (1 + 0.5)seconds ~= 3.1536 Tokens/staker
      ======================================================*/
      // ACTION: Define Amounts     
      const tokensPerSecond = await vaultContract.tokensPerSecond();
      const totalStakers = 2;
      const staker1Amount = utils.parseEther("50");
      const staker2Amount = utils.parseEther("50");
      const stakedTotal = staker1Amount.add(staker2Amount);
      const staker1Percent = "0.5";
      const staker2Percent = "0.5";
      await tokenContract.transfer(addr1.address, staker2Amount);
      const initialBalance = await tokenContract.balanceOf(owner.address);
      // NOTE: 1.5 seconds at 0.4756 tokens/second
      const expectedstaker1Yield = tokensPerSecond.mul(15).div(10);
      const expectedstaker2Yield = tokensPerSecond.mul(15).div(10);
      const expectedTotalYield = expectedstaker1Yield.add(expectedstaker2Yield);
      // ACTION: APPROVE TOKENS
      await tokenContract.approve(farmContract.address, staker1Amount);
      await tokenContract.connect(addr1).approve(farmContract.address, staker2Amount);
      // ACTION: STAKE
      await farmContract.stake(staker1Amount);
      var staker1StartTime = await farmContract.startTime();
      await farmContract.connect(addr1).stake(staker2Amount);
      // CHECK: Staked Balance
      let staker1Balance = await farmContract.getUserBalance(owner.address);
      let staker2Balance = await farmContract.getUserBalance(addr1.address);
      expect(staker1Balance).to.equal(staker1Amount);
      expect(staker2Balance).to.equal(staker2Amount);
      /* CHECK: Current Yield
      Staker 1: 1 second at 100%
      Staker 2: 0 seconds (in passed blocktime)
      */
      let yield1 = await farmContract.calculateUserTotalYield(owner.address);
      let yield2 = await farmContract.calculateUserTotalYield(addr1.address);
      expect(yield1).to.equal(tokensPerSecond);
      expect(yield2).to.equal(utils.parseEther("0"));
      // CHECK: Staked percent
      const totalStake = await farmContract.totalStaked();
      const percent1 = await farmContract.userStakingPercent(owner.address);
      const percent2 = await farmContract.userStakingPercent(addr1.address);
      expect(utils.formatEther(percent1)).to.equal(staker1Percent);
      expect(utils.formatEther(percent2)).to.equal(staker2Percent);
      // ACTION: UNSTAKE
      await farmContract.unstake(staker1Amount);
      await farmContract.connect(addr1).unstake(staker2Amount);
      var staker2UnstakeTime = await getCurrentTime();
      var totalTimeStaking = staker2UnstakeTime.sub(staker1StartTime);
      // CHECK: Total emissions generated sent to farm
      // TODO: add a percentage check
      var farmBalance = await tokenContract.balanceOf(farmContract.address);
      const vaultStartTime = await vaultContract.vaultStartTime();
      var currentTime = await getCurrentTime();
      var totalTimePassed = currentTime.sub(vaultStartTime);
      expect(farmBalance).to.be.closeTo(totalTimePassed.mul(tokensPerSecond), tolerance);
      // CHECK: Zero Staked Balance after unstake
      staker1Balance = await farmContract.getUserBalance(owner.address);
      staker2Balance = await farmContract.getUserBalance(addr1.address);
      expect(staker1Balance).to.equal(utils.parseEther("0"));
      expect(staker2Balance).to.equal(utils.parseEther("0"));
      // // CHECK: Yield 
      yield1 = await farmContract.calculateUserTotalYield(owner.address);
      yield2 = await farmContract.calculateUserTotalYield(addr1.address);
      expect(yield1).to.equal(expectedstaker1Yield);
      expect(yield2).to.equal(expectedstaker2Yield);
      expect(yield1.add(yield2)).to.be.closeTo(tokensPerSecond.mul(3), tolerance);
      // ACTION: WITHDRAW YIELD
      await farmContract.withdrawYield();
      await farmContract.connect(addr1).withdrawYield();
      // CHECK: Staker final balances
      const ownerBalance = await tokenContract.balanceOf(owner.address);
      const addr1Balance = await tokenContract.balanceOf(addr1.address);
      expect(ownerBalance).to.equal(initialBalance.add(expectedstaker1Yield));
      expect(addr1Balance).to.equal(staker2Amount.add(expectedstaker2Yield));
      // CHECK: Final farm balance      
      const finalfarmBalance = await tokenContract.balanceOf(farmContract.address);
      expect(finalfarmBalance).to.be.closeTo(farmBalance.sub(yield1).sub(yield2), tolerance);
    });

    it("4 Staker 50 Tokens Each", async () => {
      /*=================================================
      This test will have 4 users stake 50 Tokens each in series (steps 1 through 4).
      Then the users will unstake in series (Steps 5 through 8).
      1. User 1 stakes, 
      2. 1 second passes (User 1       @ 100%), User 2 stakes
      3. 1 second passes (User 1,2     @  50%), User 3 stakes 
      4. 1 second passes (User 1,2,3   @  33%), User 4 stakes 
      5. 1 second passes (User 1,2,3,4 @  25%), User 1 unstakes 
      6. 1 second passes (User 2,3,4   @  33%), User 2 unstakes 
      7. 1 second passes (User 3,4     @  50%), User 3 unstakes 
      8. 1 second passes (User 4       @ 100%), User 4 unstakes
      
      SECONDS PASSED
      --------------
      The total staking time is 7 seconds.
      Outside wallets (1,4): 
        1.0 + 0.50 + 0.33 + 0.25 ~= 2.08 seconds
      Inside wallets (2,3):  
        0.5 + 0.33 + 0.25 + 0.33 ~= 1.41 seconds
      
      TOKENS GENERATED
      ----------------
      TokensPerSecond = 2.1024
      Total Yield:
        7 seconds * 2.1024 Tokens/second ~= 14.7 Tokens
      Outside Wallets:
        2.08 seconds * 2.1024 Tokens/second ~= 4.37 Tokens
      Inside Wallets:
        1.41 seconds * 2.1024 Tokens/second ~= 2.96 Tokens
      ======================================================*/
      // Define Amounts
      const tokensPerSecond = await vaultContract.tokensPerSecond();
      const totalStakers = 4;
      const staker1Amount = utils.parseEther("50");
      const staker2Amount = utils.parseEther("50");
      const staker3Amount = utils.parseEther("50");
      const staker4Amount = utils.parseEther("50");
      const stakedTotal = staker1Amount.mul(totalStakers);
      const staker1Percent = "0.25";
      const staker2Percent = "0.25";
      const staker3Percent = "0.25";
      const staker4Percent = "0.25";
      await tokenContract.transfer(addr1.address, staker2Amount);
      await tokenContract.transfer(addr2.address, staker3Amount);
      await tokenContract.transfer(addr3.address, staker4Amount);
      // NOTE: Outside wallets(1,4) 2.083 seconds at 2.1024 tokens/second
      // NOTE: Inside  wallets(2,3) 1.416 seconds at 2.1024 tokens/second
      const expectedstaker1Yield = tokensPerSecond.mul(2083333333).div(1000000000);
      const expectedstaker2Yield = tokensPerSecond.mul(1416666667).div(1000000000);
      const expectedstaker3Yield = tokensPerSecond.mul(1416666667).div(1000000000);
      const expectedstaker4Yield = tokensPerSecond.mul(2083333333).div(1000000000);
      const expectedTotalYield = expectedstaker1Yield
        .add(expectedstaker2Yield)
        .add(expectedstaker3Yield)
        .add(expectedstaker4Yield);

      // APPROVE TOKENS TO STAKE
      await tokenContract.approve(farmContract.address, staker1Amount);
      await tokenContract.connect(addr1).approve(farmContract.address, staker2Amount);
      await tokenContract.connect(addr2).approve(farmContract.address, staker3Amount);
      await tokenContract.connect(addr3).approve(farmContract.address, staker4Amount);
      // STAKE
      await farmContract.stake(staker1Amount);
      await farmContract.connect(addr1).stake(staker2Amount);
      await farmContract.connect(addr2).stake(staker3Amount);
      await farmContract.connect(addr3).stake(staker4Amount);
      // CHECK: Staked Balance
      let staker1Balance = await farmContract.getUserBalance(owner.address);
      let staker2Balance = await farmContract.getUserBalance(addr1.address);
      let staker3Balance = await farmContract.getUserBalance(addr2.address);
      let staker4Balance = await farmContract.getUserBalance(addr3.address);
      expect(staker1Balance).to.equal(staker1Amount);
      expect(staker2Balance).to.equal(staker2Amount);
      expect(staker3Balance).to.equal(staker3Amount);
      expect(staker4Balance).to.equal(staker4Amount);
      // CHECK: Staked percent
      const totalStake = await farmContract.totalStaked();
      expect(totalStake).to.equal(stakedTotal);
      const percent1 = await farmContract.userStakingPercent(owner.address);
      const percent2 = await farmContract.userStakingPercent(addr1.address);
      const percent3 = await farmContract.userStakingPercent(addr2.address);
      const percent4 = await farmContract.userStakingPercent(addr3.address);
      expect(utils.formatEther(percent1)).to.equal(staker1Percent);
      expect(utils.formatEther(percent2)).to.equal(staker2Percent);
      expect(utils.formatEther(percent3)).to.equal(staker3Percent);
      expect(utils.formatEther(percent4)).to.equal(staker4Percent);
      // UNSTAKE
      await farmContract.unstake(staker1Amount);
      await farmContract.connect(addr1).unstake(staker2Amount);
      await farmContract.connect(addr2).unstake(staker3Amount);
      await farmContract.connect(addr3).unstake(staker4Amount);
      // CHECK UNSTAKE: Zero Staked Balance
      staker1Balance = farmContract.getUserBalance(owner.address);
      staker2Balance = farmContract.getUserBalance(addr1.address);
      staker3Balance = farmContract.getUserBalance(addr2.address);
      staker4Balance = farmContract.getUserBalance(addr3.address);
      var allPromises = Promise.all([
        staker1Balance,
        staker2Balance,
        staker3Balance,
        staker4Balance,
      ]);
      var sendPromise = allPromises.then(function(results) {
        expect(results[0]).to.equal(utils.parseEther("0"));
        expect(results[1]).to.equal(utils.parseEther("0"));
        expect(results[2]).to.equal(utils.parseEther("0"));
        expect(results[3]).to.equal(utils.parseEther("0"));
      });
      // CHECK: Yield 
      yield1 = await farmContract.calculateUserTotalYield(owner.address);
      yield2 = await farmContract.calculateUserTotalYield(addr1.address);
      yield3 = await farmContract.calculateUserTotalYield(addr2.address);
      yield4 = await farmContract.calculateUserTotalYield(addr3.address);

      expect(yield1).to.be.closeTo(expectedstaker1Yield, tolerance);
      expect(yield2).to.be.closeTo(expectedstaker2Yield, tolerance);
      expect(yield3).to.be.closeTo(expectedstaker3Yield, tolerance);
      expect(yield4).to.be.closeTo(expectedstaker4Yield, tolerance);
      expect(yield1.add(yield2).add(yield3).add(yield4)).to.be.closeTo(expectedTotalYield, tolerance);

    });
  });

});
