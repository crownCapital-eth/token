const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");
use(solidity);
const {Contract, utils, BigNumber} = require("ethers");

//use(solidity);

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
  let tokensPerEth;

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


  describe('Check Initial Token Amount', () => {
    it('Initial value is 75,000,000', async () => {
      const balance = await tokenContract.balanceOf(vaultContract.address);
      expect(ethers.utils.formatEther(balance)).to.equal('75000000.0');
    });
  });

  describe('Check Emissions', () => {
    it('Emissons 1 token per rate', async () => {      
      const tokensPerSecond = await vaultContract.tokensPerSecond();
      const secondsPerToken = await vaultContract.secondsPerToken();
      expect(tokensPerSecond).to.equal('475646879756468797');
      expect(secondsPerToken).to.equal('2102400000000000000');
      
      const t0_emissions=await vaultContract.emissions();

      const blockTime = 3     
      await ethers.provider.send("evm_increaseTime", [blockTime]);
      const totalTime = 2*blockTime;

      await vaultContract.calculateEmissions();
      const t1_emissions=await vaultContract.emissions();
      const expecteedEmissions = "4.756468797564687975"
      expect(utils.formatEther(t1_emissions)).to.equal(expecteedEmissions);
      });

      it('Emissions do not exceed balance', async () => {
        // Seconds in 5 year: 5*365*24*3600 = 157,680,000
        const gtSecondsIn5Years = 200000000;
        await ethers.provider.send("evm_increaseTime", [gtSecondsIn5Years]);
        await expect(vaultContract.calculateEmissions());         

        let t1_emissions=await vaultContract.emissions();
        t1_emissions = utils.formatEther(t1_emissions);
        expect(t1_emissions.toString()).to.equal("75000000.0");
      });


    it('Anyone can call calculateEmissions()', async () => {
      const emissions0 = await vaultContract.emissions();
      // t0=1s, blocktime=5s
      // Total time increase = t0 + increaseTime + 1*blocktime = 10s
      const expecteedEmissions = "4.756468797564687975"   
      const increaseTime = 3; //[s]
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      await vaultContract.connect(addr1).calculateEmissions();
      const emissions1 = await vaultContract.emissions();
      expect(utils.formatEther(emissions1)).to.equal(expecteedEmissions);
    });
  });

  describe('killFarm Farm method', () => {
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
