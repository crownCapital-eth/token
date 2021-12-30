const { ethers } = require("hardhat");
const { use, expect, util } = require("chai");
const { solidity } = require("ethereum-waffle");
const {Contract, utils, BigNumber} = require("ethers");
//const { getRsBlockTable } = require("qrcode-terminal/vendor/QRCode/QRRSBlock");
//const { time } = require("@openzeppelin/test-helpers");

use(solidity);

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
  let tokensPerEth;
  const tolerance = utils.parseEther("0.0001")

  beforeEach(async () => {
    // eslint-disable-next-line no-unused-vars
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    // Deploy Token contract
    TokenContract = await ethers.getContractFactory('CrownToken');
    tokenContract = await TokenContract.deploy();

    // Deploy Vault Contract
    const VaultContract = await ethers.getContractFactory('Vault');
    vaultContract = await VaultContract.deploy(tokenContract.address);

    // Deploy Farm Contract
    const FarmContract = await ethers.getContractFactory('Farm');
    farmContract = await FarmContract.deploy(tokenContract.address, vaultContract.address); 

    // Transfer Tokens
    await tokenContract.transfer(vaultContract.address, ethers.utils.parseEther('75000000'));
    await tokenContract.transfer(owner.address, ethers.utils.parseEther('25000000'));
    
    // Set the Farm Address
    await vaultContract.initializeFarm(farmContract.address, 100); 
    await vaultContract.setFarms();
    
    // Transfer Ownership
    await vaultContract.transferOwnership(owner.address);
    await farmContract.transferOwnership(owner.address);

    // Intitialize starting balances
    vaultTokensSupply = await tokenContract.balanceOf(vaultContract.address);
    farmTokensSupply = await tokenContract.balanceOf(farmContract.address);    
    ownerTokenSupply  = await tokenContract.balanceOf(owner.address);
    //tokensPerEth = await vendorContract.tokensPerEth();
  });

  describe('Check Farm Balance', () => {
    it('Initial value is 0', async () => {
      const balance = await tokenContract.balanceOf(farmContract.address);
      expect(utils.formatEther(balance)).to.equal('0.0');
    });
  });


  describe('Check Stake Method', () => {    
    it('1 Staker Deposit', async () => {
      stakeAmount=ethers.utils.parseEther('50');
      await tokenContract.approve(farmContract.address, stakeAmount);
      await farmContract.stake(stakeAmount);
      const stakerBalance =  await farmContract.getUserBalance(owner.address);
      expect(stakerBalance).to.equal(stakeAmount);
    });

    it('2 Staker Deposit', async () => {
      staker1Amount=ethers.utils.parseEther('50');
      staker2Amount=ethers.utils.parseEther('150');
      stakedTotal= ethers.utils.parseEther('200');
      tokenContract.transfer(addr1.address, staker2Amount);

      await tokenContract.approve(farmContract.address, staker1Amount);
      await tokenContract.connect(addr1).approve(farmContract.address, staker2Amount);
      await farmContract.stake(staker1Amount);
      await farmContract.connect(addr1).stake(staker2Amount);

      const staker1Balance =  await farmContract.getUserBalance(owner.address); 
      const staker2Balance =  await farmContract.getUserBalance(addr1.address);

      expect(staker1Balance).to.equal(staker1Amount);
      expect(staker2Balance).to.equal(staker2Amount);
      expect(staker1Balance.add(staker2Balance)).to.equal(stakedTotal);
    });
  });
  

  describe('Check Yield', () => {    
    it('1 Staker Yield', async () => {
      // SET CASE PARAMETERS
      stakeAmount=ethers.utils.parseEther('50');
      const tokensPerSecond = await vaultContract.tokensPerSecond();
      const expectedEmissions = utils.formatEther(tokensPerSecond);
      // APPROVE, STAKE, UPDATE YIELD
      await tokenContract.approve(farmContract.address, stakeAmount);
      await farmContract.stake(stakeAmount);
      await farmContract.updateYield();
      // Get 1 second of Yield
      const yield = await farmContract.getUserYield(owner.address);
      // CHECK: 1 Staker Yield
      expect(utils.formatEther(yield)).to.equal(expectedEmissions);
    });

    it('2 Staker Yield 50/50', async () => {
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
      const totalStakers=2;
      const staker1Amount=utils.parseEther('50');
      const staker2Amount=utils.parseEther('50');
      const stakedTotal= staker1Amount.add(staker2Amount);
      const staker1Percent = '0.5';
      const staker2Percent = '0.5';
      await tokenContract.transfer(addr1.address, staker2Amount);
      const initialBalance = await tokenContract.balanceOf(owner.address);
      // NOTE: 1.5 seconds at 2.1024 tokens/second
      const expectedstaker1Yield=tokensPerSecond.mul(15).div(10);
      const expectedstaker2Yield=tokensPerSecond.mul(15).div(10);
      const expectedTotalYield=expectedstaker1Yield.add(expectedstaker2Yield);
      // ACTION: APPROVE TOKENS
      await tokenContract.approve(farmContract.address, staker1Amount);
      await tokenContract.connect(addr1).approve(farmContract.address, staker2Amount);      
      // ACTION: STAKE
      await farmContract.stake(staker1Amount);
      await farmContract.connect(addr1).stake(staker2Amount);     
      // CHECK: Staked Balance
      let staker1Balance =  await farmContract.getUserBalance(owner.address); 
      let staker2Balance =  await farmContract.getUserBalance(addr1.address);      
      expect(staker1Balance).to.equal(staker1Amount);
      expect(staker2Balance).to.equal(staker2Amount);
      /* CHECK: Current Yield
      Staker 1: 1 second at 100%
      Staker 2: 0 seconds (in passed blocktime)
      */
      let yield1 = await farmContract.getUserYield(owner.address); 
      let yield2 = await farmContract.getUserYield(addr1.address);        
      expect(yield1).to.equal(tokensPerSecond);
      expect(yield2).to.equal(utils.parseEther("0"));      
      // CHECK: Staked percent
      const totalStake = await farmContract.totalStaked();
      //expect(totalStake).to.equal(stakedTotal);      
      const percent1 = await farmContract.userStakingPercent(owner.address, totalStake);
      const percent2 = await farmContract.userStakingPercent(addr1.address, totalStake);
      expect(utils.formatEther(percent1)).to.equal(staker1Percent);
      expect(utils.formatEther(percent2)).to.equal(staker2Percent);     
      // ACTION: UNSTAKE
      await farmContract.unstake(staker1Amount);
      await farmContract.connect(addr1).unstake(staker2Amount);
      // CHECK: Total Emissions Generated sent to farm
      var farmBalance = await tokenContract.balanceOf(farmContract.address);     
      const vaultStartTime = await vaultContract.vaultStartTime();      
      var currentTime = await farmContract.getCurrentTime();   
      var totalTimePassed = currentTime.sub(vaultStartTime);
      expect(farmBalance).to.be.closeTo(totalTimePassed.mul(tokensPerSecond), tolerance);
      // CHECK UNSTAKE: Zero Staked Balance
      staker1Balance =  await farmContract.getUserBalance(owner.address); 
      staker2Balance =  await farmContract.getUserBalance(addr1.address);
      expect(staker1Balance).to.equal(utils.parseEther('0'));
      expect(staker2Balance).to.equal(utils.parseEther('0'));            
      // CHECK: Yield 
      yield1 = await farmContract.getUserYield(owner.address); 
      yield2 = await farmContract.getUserYield(addr1.address);  
      expect(yield1).to.equal(expectedstaker1Yield);
      expect(yield2).to.equal(expectedstaker2Yield);
      expect(yield1.add(yield2)).to.be.closeTo(tokensPerSecond.mul(3),tolerance);      
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

    // it('4 Staker 50 Tokens Each', async () => {
    //   /*=================================================
    //   This test will have 4 users stake 50 Tokens each in series (steps 1 through 4).
    //   Then the users will unstake in series (Steps 5 through 8).
    //   1. User 1 stakes, 
    //   2. 1 second passes (User 1       @ 100%), User 2 stakes
    //   3. 1 second passes (User 1,2     @  50%), User 3 stakes 
    //   4. 1 second passes (User 1,2,3   @  33%), User 4 stakes 
    //   5. 1 second passes (User 1,2,3,4 @  25%), User 1 unstakes 
    //   6. 1 second passes (User 2,3,4   @  33%), User 2 unstakes 
    //   7. 1 second passes (User 3,4     @  50%), User 3 unstakes 
    //   8. 1 second passes (User 4       @ 100%), User 4 unstakes
      
    //   SECONDS PASSED
    //   --------------
    //   The total staking time is 7 seconds.
    //   Outside wallets (1,4): 
    //     1.0 + 0.50 + 0.33 + 0.25 ~= 2.08 seconds
    //   Inside wallets (2,3):  
    //     0.5 + 0.33 + 0.25 + 0.33 ~= 1.41 seconds
      
    //   TOKENS GENERATED
    //   ----------------
    //   TokensPerSecond = 2.1024
    //   Total Yield:
    //     7 seconds * 2.1024 Tokens/second ~= 14.7 Tokens
    //   Outside Wallets:
    //     2.08 seconds * 2.1024 Tokens/second ~= 4.37 Tokens
    //   Inside Wallets:
    //     1.41 seconds * 2.1024 Tokens/second ~= 2.96 Tokens
    //   ======================================================*/
    //   // Define Amounts
    //   const tokensPerSecond = await vaultContract.tokensPerSecond();
    //   const totalStakers=4;
    //   const staker1Amount=utils.parseEther('50');
    //   const staker2Amount=utils.parseEther('50');
    //   const staker3Amount=utils.parseEther('50');
    //   const staker4Amount=utils.parseEther('50');
    //   const stakedTotal= staker1Amount.mul(totalStakers);
    //   const staker1Percent = '0.25';
    //   const staker2Percent = '0.25';
    //   const staker3Percent = '0.25';
    //   const staker4Percent = '0.25';
    //   await tokenContract.transfer(addr1.address, staker2Amount);
    //   await tokenContract.transfer(addr2.address, staker3Amount);
    //   await tokenContract.transfer(addr3.address, staker4Amount);
    //   // NOTE: Outside wallets(1,4) 2.083 seconds at 2.1024 tokens/second
    //   // NOTE: Inside  wallets(2,3) 1.416 seconds at 2.1024 tokens/second
    //   const expectedstaker1Yield=tokensPerSecond.mul(2083333333).div(1000000000);
    //   const expectedstaker2Yield=tokensPerSecond.mul(1416666667).div(1000000000);
    //   const expectedstaker3Yield=tokensPerSecond.mul(1416666667).div(1000000000);
    //   const expectedstaker4Yield=tokensPerSecond.mul(2083333333).div(1000000000);
    //   const expectedTotalYield=expectedstaker1Yield
    //                            .add(expectedstaker2Yield)
    //                            .add(expectedstaker3Yield)
    //                            .add(expectedstaker4Yield);

    //   // APPROVE TOKENS TO STAKE
    //   await tokenContract.approve(farmContract.address, staker1Amount);
    //   await tokenContract.connect(addr1).approve(farmContract.address, staker2Amount);
    //   await tokenContract.connect(addr2).approve(farmContract.address, staker3Amount);
    //   await tokenContract.connect(addr3).approve(farmContract.address, staker4Amount);
    //   // STAKE
    //   await farmContract.stake(staker1Amount);
    //   await farmContract.connect(addr1).stake(staker2Amount);
    //   await farmContract.connect(addr2).stake(staker3Amount);
    //   await farmContract.connect(addr3).stake(staker4Amount);
    //   // CHECK: Staked Balance
    //   let staker1Balance = await farmContract.getUserBalance(owner.address);
    //   let staker2Balance = await farmContract.getUserBalance(addr1.address);
    //   let staker3Balance = await farmContract.getUserBalance(addr2.address);
    //   let staker4Balance = await farmContract.getUserBalance(addr3.address);
    //   expect(staker1Balance).to.equal(staker1Amount);
    //   expect(staker2Balance).to.equal(staker2Amount);
    //   expect(staker3Balance).to.equal(staker3Amount);
    //   expect(staker4Balance).to.equal(staker4Amount);    
    //   // CHECK: Staked percent
    //   const totalStake = await farmContract.totalStaked();
    //   expect(totalStake).to.equal(stakedTotal);      
    //   const percent1 = await farmContract.userStakingPercent(owner.address, totalStake);
    //   const percent2 = await farmContract.userStakingPercent(addr1.address, totalStake);
    //   const percent3 = await farmContract.userStakingPercent(addr2.address, totalStake);
    //   const percent4 = await farmContract.userStakingPercent(addr3.address, totalStake);
    //   expect(utils.formatEther(percent1)).to.equal(staker1Percent);
    //   expect(utils.formatEther(percent2)).to.equal(staker2Percent);     
    //   expect(utils.formatEther(percent3)).to.equal(staker3Percent);  
    //   expect(utils.formatEther(percent4)).to.equal(staker4Percent);  
    //   // UNSTAKE
    //   await farmContract.unstake(staker1Amount);
    //   await farmContract.connect(addr1).unstake(staker2Amount);
    //   await farmContract.connect(addr2).unstake(staker3Amount);
    //   await farmContract.connect(addr3).unstake(staker4Amount);
    //   // CHECK UNSTAKE: Zero Staked Balance
    //   staker1Balance =  farmContract.getUserBalance(owner.address); 
    //   staker2Balance =  farmContract.getUserBalance(addr1.address);
    //   staker3Balance =  farmContract.getUserBalance(addr2.address);
    //   staker4Balance =  farmContract.getUserBalance(addr3.address);
    //   var allPromises = Promise.all([
    //     staker1Balance,
    //     staker2Balance,
    //     staker3Balance,
    //     staker4Balance
    //   ]);      
    //   var sendPromise = allPromises.then(function(results) {
    //     expect(results[0]).to.equal(utils.parseEther('0'));
    //     expect(results[1]).to.equal(utils.parseEther('0'));
    //     expect(results[2]).to.equal(utils.parseEther('0'));
    //     expect(results[3]).to.equal(utils.parseEther('0'));
    //   });
    //   // CHECK: Yield 
    //   yield1 = await farmContract.getUserYield(owner.address); 
    //   yield2 = await farmContract.getUserYield(addr1.address);  
    //   yield3 = await farmContract.getUserYield(addr2.address);  
    //   yield4 = await farmContract.getUserYield(addr3.address);  
      
    //   expect(yield1).to.be.closeTo(expectedstaker1Yield,tolerance);
    //   expect(yield2).to.be.closeTo(expectedstaker2Yield,tolerance);
    //   expect(yield3).to.be.closeTo(expectedstaker3Yield,tolerance);
    //   expect(yield4).to.be.closeTo(expectedstaker4Yield,tolerance);
    //   expect(yield1.add(yield2).add(yield3).add(yield4)).to.
    //   be.closeTo(expectedTotalYield, tolerance);

    // });
  });

describe('Check Balance', () => {        
    it('Balance: 2 Staker Deposit', async () => {
      staker1Amount=ethers.utils.parseEther('50');
      staker2Amount=ethers.utils.parseEther('75');
      stakedTotal= ethers.utils.parseEther('125');
      tokenContract.transfer(addr1.address, staker2Amount);

      await tokenContract.approve(farmContract.address, staker1Amount);
      await tokenContract.connect(addr1).approve(farmContract.address, staker2Amount);
      await farmContract.stake(staker1Amount);
      await farmContract.connect(addr1).stake(staker2Amount);

      const staker1Balance =  await farmContract.getUserBalance(owner.address); 
      const staker2Balance =  await farmContract.getUserBalance(addr1.address);

      expect(staker1Balance).to.equal(staker1Amount);
      expect(staker2Balance).to.equal(staker2Amount);
      expect(staker1Balance.add(staker2Balance)).to.equal(stakedTotal);
    });

    it('Balance: 3 Staker Deposit', async () => {
      staker1Amount=ethers.utils.parseEther('50');
      staker2Amount=ethers.utils.parseEther('50');
      staker3Amount=ethers.utils.parseEther('50');
      stakedTotal= ethers.utils.parseEther('150');
      tokenContract.transfer(addr1.address, staker2Amount);
      tokenContract.transfer(addr2.address, staker3Amount);

      await tokenContract.approve(farmContract.address, staker1Amount);
      await tokenContract.connect(addr1).approve(farmContract.address, staker2Amount);
      await tokenContract.connect(addr2).approve(farmContract.address, staker3Amount);
      await farmContract.stake(staker1Amount);
      await farmContract.connect(addr1).stake(staker2Amount);
      await farmContract.connect(addr2).stake(staker3Amount);

      const staker1Balance =  await farmContract.getUserBalance(owner.address); 
      const staker2Balance =  await farmContract.getUserBalance(addr1.address);
      const staker3Balance =  await farmContract.getUserBalance(addr2.address);

      expect(staker1Balance).to.equal(staker1Amount);
      expect(staker2Balance).to.equal(staker2Amount);
      expect(staker3Balance).to.equal(staker3Amount);
      expect(staker1Balance
             .add(staker2Balance)
             .add(staker3Balance))
             .to.equal(stakedTotal);
    });

    it('Balance: 2 Stakers Deposit, 1 unstakes all', async () => {
      staker1Amount=utils.parseEther('50');
      staker2Amount=utils.parseEther('75');
      stakedTotal= utils.parseEther('125');
      tokenContract.transfer(addr1.address, staker2Amount);

      await tokenContract.approve(farmContract.address, staker1Amount);
      await tokenContract.connect(addr1).approve(farmContract.address, staker2Amount);
      await farmContract.stake(staker1Amount);
      await farmContract.connect(addr1).stake(staker2Amount);

      const staker2Balance =  await farmContract.getUserBalance(addr1.address);

      await farmContract.unstake(staker1Amount);
      const staker1Balance =  await farmContract.getUserBalance(owner.address); 

      expect(staker1Balance).to.equal(utils.parseEther('0'));
      expect(staker2Balance).to.equal(staker2Amount);
      expect(staker1Balance.add(staker2Balance)).to.equal(staker2Balance);
    });


    it('Balance: 2 Stakers Deposit, 1 unstakes all, then overdraws', async () => {
      staker1Amount=utils.parseEther('50');
      staker2Amount=utils.parseEther('75');
      stakedTotal= utils.parseEther('125');
      tokenContract.transfer(addr1.address, staker2Amount);

      await tokenContract.approve(farmContract.address, staker1Amount);
      await tokenContract.connect(addr1).approve(farmContract.address, staker2Amount);
      await farmContract.stake(staker1Amount);
      await farmContract.connect(addr1).stake(staker2Amount);
      await farmContract.unstake(staker1Amount);
      const staker1Balance =  await farmContract.getUserBalance(owner.address); 

      await expect(farmContract.unstake(staker1Amount))
        .to.be.revertedWith("Nothing to unstake");
    });

  });

});
