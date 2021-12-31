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
  let FarmContract;

  let vaultTokensSupply;
  let FarmTokensSupply;
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
      expect(await vaultContract.connect(addr1).calculatePerFarmEmissions())
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

    it('killFarms', async () => {
      await expect(
        vaultContract.connect(addr1).killFarms())
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

    it('Emissions rate', async () => {
      const tokensPerSecond = await vaultContract.tokensPerSecond();
      const secondsPerToken = await vaultContract.secondsPerToken();
      expect(tokensPerSecond).to.equal('475646879756468797');
      expect(secondsPerToken).to.equal('2102400000000000000');
    });
  });

  describe('Check Emissions', () => {
    it('Total Emissons at expected rate', async () => { 
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

      it('Emissions does not exceed balance', async () => {
        // ACTION: Set parameters
        const initialBalance = await tokenContract.balanceOf(vaultContract.address);
          // NOTE: Seconds in 5 year: 5*365*24*3600 = 157,680,000
        const greaterThanSecondsIn5Years = 200000000;
        // ACTION: Increase time
        await ethers.provider.send("evm_increaseTime", [greaterThanSecondsIn5Years]);
        await expect(vaultContract.calculateEmissions());         
        // Check: emissions == initialBalance
        var t1_emissions=await vaultContract.emissions();
        expect(t1_emissions).to.equal(initialBalance);
      });



  });

  describe('killFarms Farm method', () => {
    it('Check Farm Address', async () => {    
      const vaultFarmAddress = await vaultContract.activeFarmTokens(0);          
      const farmAddress = await farmContract.address;
      expect(vaultFarmAddress).to.equal(farmAddress);      
    });
  });

  describe('Test initialize Farm method', () => {
    it('Check Farm Address', async () => {    
      const vaultFarmAddress = await vaultContract.activeFarmTokens(0);          
      const farmAddress = await farmContract.address;
      expect(vaultFarmAddress).to.equal(farmAddress);      
    });


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

    it('setFarms reverted because no farms initialized', async () => {
      await expect(
        vaultContract.setFarms())
        .to.be.revertedWith("To set farm at least 1 farm must be initialized");
    }); 

    it('setFarms reverted because percent == 100', async () => {
      await vaultContract.initializeFarm(farmContract.address, 55);
      await vaultContract.initializeFarm(addr1.address, 55);
      await expect(
        vaultContract.setFarms())
        .to.be.revertedWith("Total Percent must be 100");
    });        

  });



  describe('Test sendToFarm() method', () => {
    it('Check Send Emissions to Farm', async () => {
      // t0=1s, blocktime=5s
      // Total time increase = t0 + increaseTime + 1*blocktime = 10s
      const expectedEmissions = "4.756468797564687975"      
      const increaseTime = 3;
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      
      await vaultContract.sendToFarm();                

      const farmBalance = await tokenContract.balanceOf(farmContract.address);      
      expect(utils.formatEther(farmBalance)).to.equal(expectedEmissions);
            
      const emissions = await vaultContract.emissions();
      expect(utils.formatEther(emissions)).to.equal('0.0');
    });
  });

});
