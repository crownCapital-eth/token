const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");
use(solidity);
const {Contract, utils, BigNumber} = require("ethers");

async function getCurrentTime() {
  const blockNum = await ethers.provider.getBlockNumber();
  const currentBlock = await ethers.provider.getBlock(blockNum);
  var currentTime = BigNumber.from(currentBlock.timestamp);
  return currentTime;
};


describe("Vault", () => {
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let addrs;

  let tokenContract;
  let vaultContract;
  let farmContract;

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
    // Start Emissions
    await vaultContract.startEmissions()    

    // Deploy Farm Contract
    const FarmContract = await ethers.getContractFactory('Farm');
    farmContract = await FarmContract.deploy(tokenContract.address, vaultContract.address);

    // Transfer Tokens
    await tokenContract.transfer(vaultContract.address, ethers.utils.parseEther('75000000'));
    await tokenContract.transfer(owner.address, ethers.utils.parseEther('25000000'));

    // Set the Farm Address
    await vaultContract.initializeFarm(farmContract.address, 100);
    const secondsIn48Hours = 172800;
    await ethers.provider.send("evm_increaseTime", [secondsIn48Hours]);
    await ethers.provider.send("evm_mine");
    await vaultContract.setFarms();

    // Transfer Ownership
    await vaultContract.transferOwnership(owner.address);
    await farmContract.transferOwnership(owner.address);

    // Intitialize starting balances
    vaultTokensSupply = await tokenContract.balanceOf(vaultContract.address);
    farmTokensSupply = await tokenContract.balanceOf(farmContract.address);
    ownerTokenSupply  = await tokenContract.balanceOf(owner.address);
  });

  describe('Anyone can call', () => {
    it('calculateEmissions()', async () => {
      expect(await vaultContract.connect(addr1).calculateEmissions())
        .to.be.ok;
    });

    it('sendToFarm()', async () => {
      expect(await vaultContract.connect(addr1).sendToFarm())
        .to.be.ok;
    });

    it('calculatePerFarmEmissions()', async () => {
      expect(await vaultContract.connect(addr1).calculatePerFarmEmissions(farmContract.address))
        .to.be.ok;
    });

    it('getFarmTokens()', async () => {
      expect(await vaultContract.connect(addr1).getFarmTokens())
        .to.be.ok;
    });

    it('getFarmPercents()', async () => {
      expect(await vaultContract.connect(addr1).getFarmPercents())
        .to.be.ok;
    });

    it('getActiveFarmTokens()', async () => {
      expect(await vaultContract.connect(addr1).getActiveFarmTokens())
        .to.be.ok;
    });

    it('getActiveFarmPercents()', async () => {
      expect(await vaultContract.connect(addr1).getActiveFarmPercents(addr1.address))
        .to.be.ok;
    });

    // it('getPerFarmEmissions()', async () => {
    //   expect(await vaultContract.connect(addr1).getPerFarmEmissions(addr1.address))
    //   .to.be.ok;
    // });

    it('isFarmActive()', async () => {
      await expect(vaultContract.connect(addr1).isFarmActive(addr1.address))
        .to.be.ok;
    });
  });

  describe('Only Owner', () => {
    it('initializeFarm', async () => {
      await expect(
        vaultContract.connect(addr1).initializeFarm(addr1.address, 100))
        .to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('setFarms', async () => {
      await expect(
        vaultContract.connect(addr1).setFarms())
        .to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('resetInitialization', async () => {
      await expect(
        vaultContract.connect(addr1).resetInitialization())
        .to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('killActiveFarms', async () => {
      await expect(
        vaultContract.connect(addr1).killActiveFarms())
        .to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('calculateTotalPercent', async () => {
      await expect(
        vaultContract.connect(addr1).calculateTotalPercent())
        .to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('Check Initial vaules', () => {
    it('Tokens in vault is 75,000,000', async () => {
      const balance = await tokenContract.balanceOf(vaultContract.address);
      expect(ethers.utils.formatEther(balance)).to.equal('75000000.0');
    });

    it('Check Farm Address', async () => {
      const vaultFarmAddress = await vaultContract.activeFarmTokens(0);
      const farmAddress = await farmContract.address;
      expect(vaultFarmAddress).to.equal(farmAddress);
    });

    it('Emissions rate', async () => {
      const tokensPerSecond = await vaultContract.tokensPerSecond();
      const secondsPerToken = await vaultContract.secondsPerToken();
      expect(tokensPerSecond).to.equal('475646879756468797');
      expect(secondsPerToken).to.equal('2102400000000000000');
    });
  });

  describe('Initialize Farm method', () => {

    it('initializeFarm reverted because percent out of range', async () => {
      await expect(
        vaultContract.initializeFarm(farmContract.address, 101))
        .to.be.revertedWith('Percent must be between 0 and 100');
    });

    it('farmTokens starts empty', async () => {
      var farmTokens = await vaultContract.getFarmTokens()
      expect(farmTokens[0]).to.equal();
    });

    it('farmPercents starts empty', async () => {
      var farmPercents = await vaultContract.getFarmPercents()
      expect(farmPercents[0]).to.equal();
    });

    it('initializeFarm: 1 Farm', async () => {
      await vaultContract.initializeFarm(addr1.address, 50);
      var farmTokens = await vaultContract.getFarmTokens()
      var farmPercents = await vaultContract.getFarmPercents()
      expect(farmTokens[0]).to.equal(addr1.address);
      expect(farmPercents[0]).to.equal(50);
    });

    it('initializeFarm: 2 Farms', async () => {
      await vaultContract.initializeFarm(addr1.address, 50);
      await vaultContract.initializeFarm(addr2.address, 45);
      var farmTokens = await vaultContract.getFarmTokens()
      var farmPercents = await vaultContract.getFarmPercents()
      expect(farmTokens[0]).to.equal(addr1.address);
      expect(farmPercents[0]).to.equal(50);
      expect(farmTokens[1]).to.equal(addr2.address);
      expect(farmPercents[1]).to.equal(45);
    });

    it('resetInitialization empties farmTokens and farmPercents arrarys', async () => {
      await vaultContract.initializeFarm(addr1.address, 50);
      await vaultContract.initializeFarm(addr2.address, 45);
      await vaultContract.resetInitialization();
      var farmTokens = await vaultContract.getFarmTokens()
      var farmPercents = await vaultContract.getFarmPercents()
      expect(farmTokens[0]).to.equal();
      expect(farmPercents[0]).to.equal();
    });

    it('Can intialize after reseting initialization', async () => {
      await vaultContract.initializeFarm(addr1.address, 50);
      await vaultContract.initializeFarm(addr2.address, 45);
      await vaultContract.resetInitialization();
      await vaultContract.initializeFarm(addr3.address, 30);
      var farmTokens = await vaultContract.getFarmTokens()
      var farmPercents = await vaultContract.getFarmPercents()
      expect(farmTokens[0]).to.equal(addr3.address);
      expect(farmPercents[0]).to.equal(30);
    });
  });

  describe('setFarms() method', () => {
    it('setFarms reverted because no farms initialized', async () => {
      await expect(
        vaultContract.setFarms())
        .to.be.revertedWith("To set farm at least 1 farm must be initialized");
    });

    it('setFarms reverted because percent > 100', async () => {
      await vaultContract.initializeFarm(farmContract.address, 55);
      await vaultContract.initializeFarm(addr1.address, 55);
      const secondsIn48Hours = 172800;
      await ethers.provider.send("evm_increaseTime", [secondsIn48Hours]);
      await ethers.provider.send("evm_mine");
      await expect(
        vaultContract.setFarms())
        .to.be.revertedWith("Total Percent must be 100");
    });

    it('setFarms reverted because percent < 100', async () => {
      await vaultContract.initializeFarm(farmContract.address, 55);
      const secondsIn48Hours = 172800;
      await ethers.provider.send("evm_increaseTime", [secondsIn48Hours]);
      await ethers.provider.send("evm_mine");
      await expect(
        vaultContract.setFarms())
        .to.be.revertedWith("Total Percent must be 100");
    });

    it('setFarms: 1 Farm', async () => {
      // ACTION: Initialize 1 farm 100% and set the farm
      await vaultContract.initializeFarm(addr1.address, 100);
      const secondsIn48Hours = 172800;
      await ethers.provider.send("evm_increaseTime", [secondsIn48Hours]);
      await ethers.provider.send("evm_mine");
      await vaultContract.setFarms();
      // CHECK: initialization arrays deleted
      farmTokens = await vaultContract.getFarmTokens();
      farmPercents = await vaultContract.getFarmPercents();
      expect(farmTokens[0]).to.equal();
      expect(farmPercents[0]).to.equal();
      //CHECK: Active farm and percent
      var activeFarms = await vaultContract.getActiveFarmTokens();
      var farm1Percent = await vaultContract.getActiveFarmPercents(addr1.address);
      expect(activeFarms[0]).to.equal(addr1.address);
      expect(farm1Percent).to.equal(BigNumber.from(100));
    });

    it('setFarms: 2 Farms', async () => {
      // ACTION: Initialize and set 2 farms
      await vaultContract.initializeFarm(addr1.address, 45);
      await vaultContract.initializeFarm(addr2.address, 55);
      const secondsIn48Hours = 172800;
      await ethers.provider.send("evm_increaseTime", [secondsIn48Hours]);
      await ethers.provider.send("evm_mine");
      await vaultContract.setFarms();
      // CHECK: initialization arrays deleted
      farmTokens = await vaultContract.getFarmTokens();
      farmPercents = await vaultContract.getFarmPercents();
      expect(farmTokens[0]).to.equal();
      expect(farmPercents[0]).to.equal();
      //CHECK: Active farm and percent
      var activeFarms = await vaultContract.getActiveFarmTokens();
      var farm1Percent = await vaultContract.getActiveFarmPercents(addr1.address);
      var farm2Percent = await vaultContract.getActiveFarmPercents(addr2.address);
      expect(activeFarms[0]).to.equal(addr1.address);
      expect(activeFarms[1]).to.equal(addr2.address);
      expect(farm1Percent).to.equal(BigNumber.from(45));
      expect(farm2Percent).to.equal(BigNumber.from(55));
    });

  });


  describe('Total Emissions: calculateEmissions()', () => {
    it('1 Farm: Emissions does not exceed contract balance', async () => {
      // ACTION: Set parameters
      const initialBalance = await tokenContract.balanceOf(vaultContract.address);
      // NOTE: Seconds in 5 year: 5*365*24*3600 = 157,680,000
      const greaterThanSecondsIn5Years = 200000000;
      // ACTION: Increase time
      await ethers.provider.send("evm_increaseTime", [greaterThanSecondsIn5Years]);
      await expect(vaultContract.calculateEmissions());
      // CHECK: emissions == initialBalance
      var t1_emissions=await vaultContract.emissions();
      expect(t1_emissions).to.equal(initialBalance);
    });

    it('1 Farm: Emissions does not exceed balance (call twice)', async () => {
      // ACTION: Set parameters
      const initialBalance = await tokenContract.balanceOf(vaultContract.address);
      // NOTE: Seconds in 5 year: 5*365*24*3600 = 157,680,000
      const greaterThanSecondsIn5Years = 200000000;
      // ACTION: Increase time
      await ethers.provider.send("evm_increaseTime", [greaterThanSecondsIn5Years]);
      await expect(vaultContract.calculateEmissions());
      // CHECK: emissions == initialBalance
      var t1_emissions=await vaultContract.emissions();
      expect(t1_emissions).to.equal(initialBalance);
      // ACTION: Increase time
      await ethers.provider.send("evm_increaseTime", [greaterThanSecondsIn5Years]);
      await expect(vaultContract.calculateEmissions());
      // CHECK: emissions == initialBalance
      var t1_emissions=await vaultContract.emissions();
      expect(t1_emissions).to.equal(initialBalance);
    });

    it('1 Farm: Emissions matches expected rate', async () => {
      // ACTION: Define Amounts
      const tokensPerSecond = await vaultContract.tokensPerSecond();
      const t0 = await vaultContract.vaultStartTime();
      // ACTION: Increase Time
      const increaseTime = 3;
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      // ACTION: Update Emissions
      await vaultContract.calculateEmissions();
      // ACTION: Current time and seconds passed
      var currentTime = await getCurrentTime()
      const secondsPassed = currentTime.sub(t0);
      // ACTION: Calculate Expected Emissions
      const expecteedEmissions = secondsPassed.mul(tokensPerSecond);
      const t1_emissions=await vaultContract.emissions();
      // CHECK: Emissions
      expect(t1_emissions).to.closeTo(expecteedEmissions, tolerance);
    });

    it('2 Farm: Emissions does not exceed contract balance', async () => {
      // ACTION: Set parameters
      const initialBalance = await tokenContract.balanceOf(vaultContract.address);
      // ACTION: Initialize and set 2 farms
      await vaultContract.initializeFarm(addr1.address, 45);
      await vaultContract.initializeFarm(addr2.address, 55);
      const secondsIn48Hours = 172800;
      await ethers.provider.send("evm_increaseTime", [secondsIn48Hours]);
      await ethers.provider.send("evm_mine");
      await vaultContract.setFarms();
      // NOTE: Seconds in 5 year: 5*365*24*3600 = 157,680,000
      const greaterThanSecondsIn5Years = 200000000;
      // ACTION: Increase time
      await ethers.provider.send("evm_increaseTime", [greaterThanSecondsIn5Years]);
      await expect(vaultContract.calculateEmissions());
      // CHECK: emissions == initialBalance
      var t1_emissions=await vaultContract.emissions();
      expect(t1_emissions).to.equal(initialBalance);
    });

    it('2 Farm: Emissions matches expected rate', async () => {
      // ACTION: Define Amounts
      const tokensPerSecond = await vaultContract.tokensPerSecond();
      const t0 = await vaultContract.vaultStartTime();
      // ACTION: Initialize and set 2 farms
      await vaultContract.initializeFarm(addr1.address, 45);
      await vaultContract.initializeFarm(addr2.address, 55);
      const secondsIn48Hours = 172800;
      await ethers.provider.send("evm_increaseTime", [secondsIn48Hours]);
      await ethers.provider.send("evm_mine");
      await vaultContract.setFarms();
      // ACTION: Increase Time
      const increaseTime = 3;
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      // ACTION: Update Emissions
      await vaultContract.calculateEmissions();
      // ACTION: Current time and seconds passed
      var currentTime = await getCurrentTime()
      const secondsPassed = currentTime.sub(t0);
      // ACTION: Calculate Expected Emissions
      const expecteedEmissions = secondsPassed.mul(tokensPerSecond);
      const t1_emissions=await vaultContract.emissions();
      // CHECK: Emissions
      expect(t1_emissions).to.closeTo(expecteedEmissions, tolerance);
    });
  });

  describe('Per Farm Emissions: calculatePerFarmEmissions()', () => {
    it('1 Farm: Per farm emissions does not exceed contract balance', async () => {
      // ACTION: Set parameters
      const initialBalance = await tokenContract.balanceOf(vaultContract.address);
      // NOTE: Seconds in 5 year: 5*365*24*3600 = 157,680,000
      const greaterThanSecondsIn5Years = 200000000;
      // ACTION: Increase time
      await ethers.provider.send("evm_increaseTime", [greaterThanSecondsIn5Years]);
      await expect(vaultContract.calculateEmissions());
      // CHECK: emissions == initialBalance
      var t1_emissions=await vaultContract.emissions();
      expect(t1_emissions).to.equal(initialBalance);
      // CHECK: Per farm emissions match expected percent
      var farm1Emissions = await vaultContract.calculatePerFarmEmissions(farmContract.address);
      expect(farm1Emissions).to.equal(initialBalance);
    });

    it('1 Farm: 1 per farm emissions does not exceed balance (call twice)', async () => {
      // ACTION: Set parameters
      const initialBalance = await tokenContract.balanceOf(vaultContract.address);
      // NOTE: Seconds in 5 year: 5*365*24*3600 = 157,680,000
      const greaterThanSecondsIn5Years = 200000000;
      // ACTION: Increase time
      await ethers.provider.send("evm_increaseTime", [greaterThanSecondsIn5Years]);
      await expect(vaultContract.calculateEmissions());
      // CHECK: emissions == initialBalance
      var t1_emissions=await vaultContract.emissions();
      expect(t1_emissions).to.equal(initialBalance);
      // CHECK: Per farm emissions match expected percent
      var farm1Emissions = await vaultContract.calculatePerFarmEmissions(farmContract.address);
      expect(farm1Emissions).to.equal(initialBalance);
      // Increase time check again
      await ethers.provider.send("evm_increaseTime", [greaterThanSecondsIn5Years]);
      await expect(vaultContract.calculateEmissions());
      // CHECK: Per farm emissions match expected percent
      var farm1Emissions = await vaultContract.calculatePerFarmEmissions(farmContract.address);
      expect(farm1Emissions).to.equal(initialBalance);

    });

    it('1 Farm: Emissions matches expected rate', async () => {
      // ACTION: Define Amounts
      const tokensPerSecond = await vaultContract.tokensPerSecond();
      const t0 = await vaultContract.vaultStartTime();
      // ACTION: Increase Time
      const increaseTime = 3;
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      // ACTION: Update Emissions
      await vaultContract.calculateEmissions();
      // ACTION: Current time and seconds passed
      var currentTime = await getCurrentTime()
      const secondsPassed = currentTime.sub(t0);
      // ACTION: Calculate Expected Emissions
      const expecteedEmissions = secondsPassed.mul(tokensPerSecond);
      const t1_emissions=await vaultContract.emissions();
      // CHECK: Emissions
      expect(t1_emissions).to.be.closeTo(expecteedEmissions, tolerance);
      // CHECK: Per farm emissions match expected percent
      var farm1Emissions = await vaultContract.calculatePerFarmEmissions(farmContract.address);
      expect(farm1Emissions).to.be.closeTo(expecteedEmissions, tolerance);
    });

    it('2 Farm: Emissions does not exceed contract balance', async () => {
      // ACTION: Set parameters
      const initialBalance = await tokenContract.balanceOf(vaultContract.address);
      // ACTION: Initialize and set 2 farms
      const farm1Percent=45;
      const farm2Percent=55;
      await vaultContract.initializeFarm(addr1.address, farm1Percent);
      await vaultContract.initializeFarm(addr2.address, farm2Percent);
      const secondsIn48Hours = 172800;
      await ethers.provider.send("evm_increaseTime", [secondsIn48Hours]);
      await ethers.provider.send("evm_mine");
      await vaultContract.setFarms();
      // NOTE: Seconds in 5 year: 5*365*24*3600 = 157,680,000
      const greaterThanSecondsIn5Years = 200000000;
      // ACTION: Increase time
      await ethers.provider.send("evm_increaseTime", [greaterThanSecondsIn5Years]);
      await ethers.provider.send('evm_mine');
      await expect(vaultContract.calculateEmissions());
      // CHECK: emissions == initialBalance
      var t1_emissions=await vaultContract.emissions();
      expect(t1_emissions).to.equal(initialBalance);
      // CHECK: Per farm emissions match expected percent
      var farm1Emissions = await vaultContract.calculatePerFarmEmissions(addr1.address);
      var farm2Emissions = await vaultContract.calculatePerFarmEmissions(addr2.address);
      expect(farm1Emissions).to.equal(initialBalance.mul(farm1Percent).div(100));
      expect(farm2Emissions).to.equal(initialBalance.mul(farm2Percent).div(100));
    });

    it('2 Farm: Emissions matches expected rate', async () => {
      // ACTION: Define Amounts
      const farm1Percent=45;
      const farm2Percent=55;
      const tokensPerSecond = await vaultContract.tokensPerSecond();
      const t0 = await vaultContract.vaultStartTime();
      // ACTION: Initialize and set 2 farms
      await vaultContract.initializeFarm(addr1.address, farm1Percent);
      await vaultContract.initializeFarm(addr2.address, farm2Percent);
      const secondsIn48Hours = 172800;
      await ethers.provider.send("evm_increaseTime", [secondsIn48Hours]);
      await ethers.provider.send("evm_mine");
      await vaultContract.setFarms();
      // ACTION: Increase Time
      const increaseTime = 3;
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      // ACTION: Update Emissions
      await vaultContract.calculateEmissions();
      // ACTION: Current time and seconds passed
      var currentTime = await getCurrentTime()
      const secondsPassed = currentTime.sub(t0);
      // ACTION: Calculate Expected Emissions
      const expecteedEmissions = secondsPassed.mul(tokensPerSecond);
      const t1_emissions=await vaultContract.emissions();
      // CHECK: Emissions
      expect(t1_emissions).to.closeTo(expecteedEmissions, tolerance);
      // CHECK: Per farm emissions match expected percent
      var farm1Emissions = await vaultContract.calculatePerFarmEmissions(addr1.address);
      var farm2Emissions = await vaultContract.calculatePerFarmEmissions(addr2.address);
      expect(farm1Emissions).to.be.closeTo(t1_emissions.mul(farm1Percent).div(100), tolerance);
      expect(farm2Emissions).to.be.closeTo(t1_emissions.mul(farm2Percent).div(100), tolerance);
    });
  });

  describe('sendToFarm()', () => {
    it('1 Farm: Check Send Emissions to Farm', async () => {
      // ACTION: Define Amounts
      const tokensPerSecond = await vaultContract.tokensPerSecond();
      const t0 = await vaultContract.vaultStartTime();
      // ACTION: Increase Time
      const increaseTime = 3;
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      // ACTION: Send Emissions to farm
      // await vaultContract.calculateEmissions();
      await vaultContract.sendToFarm();

      // ACTION: Current time and seconds passed
      var currentTime = await getCurrentTime()
      const secondsPassed = currentTime.sub(t0);
      // ACTION: Calculate Expected Emissions
      const expecteedEmissions = secondsPassed.mul(tokensPerSecond);
      // CHECK: Per farm emissions match expected percent
      const farmBalance = await tokenContract.balanceOf(farmContract.address);
      expect(farmBalance).to.be.closeTo(expecteedEmissions, tolerance);
    });

    it('2 Farm: Check Send Emissions to Farm', async () => {
      // ACTION: Define Amounts
      const farm1Percent=45;
      const farm2Percent=55;
      const tokensPerSecond = await vaultContract.tokensPerSecond();
      const t0 = await vaultContract.vaultStartTime();
      // ACTION: Initialize and set 2 farms
      await vaultContract.initializeFarm(addr1.address, farm1Percent);
      await vaultContract.initializeFarm(addr2.address, farm2Percent);
      const secondsIn48Hours = 172800;
      await ethers.provider.send("evm_increaseTime", [secondsIn48Hours]);
      await ethers.provider.send("evm_mine");
      await vaultContract.setFarms();
      // ACTION: Increase Time
      const increaseTime = 3;
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      await ethers.provider.send('evm_mine');
      // ACTION: Send Emissions to farm
      await vaultContract.sendToFarm();

      // CHECK: Per farm emissions match expected percent
      var currentTime = await getCurrentTime()
      const secondsPassed = currentTime.sub(t0);
      const expecteedEmissionsTotal = secondsPassed.mul(tokensPerSecond);
      const expecteedEmissionsFarm1 = expecteedEmissionsTotal.mul(farm1Percent).div(100);
      const expecteedEmissionsFarm2 = expecteedEmissionsTotal.mul(farm2Percent).div(100);
      const farm1Balance = await tokenContract.balanceOf(addr1.address);
      const farm2Balance = await tokenContract.balanceOf(addr2.address);
      expect(farm1Balance).to.be.closeTo(expecteedEmissionsFarm1, tolerance);
      expect(farm2Balance).to.be.closeTo(expecteedEmissionsFarm2, tolerance);
    });
  });


  describe('killActiveFarms()', () => {
    it('Check Farm Address', async () => {
      // ACTION: Kill Active Farms
      await vaultContract.killActiveFarms();
      // CHECK: No active addresses
      const farmAddresses = await vaultContract.getActiveFarmTokens();
      expect(farmAddresses[0]).to.equal();
    });
  });

  describe('isFarmActive()', () => {
    it('Check Farm Address is Active', async () => {
      // CHECK: Farm is active
      const active = await vaultContract.isFarmActive(farmContract.address);
      expect(active).to.equal(true);
    });
    it('Check Farm Address is not Active', async () => {
      // CHECK: Address is not active
      const active = await vaultContract.isFarmActive(owner.address);
      expect(active).to.equal(false);
    });
  });

});