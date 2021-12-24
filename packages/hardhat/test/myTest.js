const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");
const {Contract, utils, BigNumber} = require("ethers");
//const { getRsBlockTable } = require("qrcode-terminal/vendor/QRCode/QRRSBlock");
//const { time } = require("@openzeppelin/test-helpers");

use(solidity);

describe("Yield Farm", () => {
  let owner;
  let addr1;
  let addr2;
  let addrs;

  let tokenContract;
  let vaultContract;
  let FarmContract;

  let vaultTokensSupply;
  let FarmTokensSupply;
  let tokensPerEth;

  beforeEach(async () => {
    // eslint-disable-next-line no-unused-vars
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

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
    console.log("\n Set Farm address to Farm Contract\n");
    const setFarmAddress = await vaultContract.assignFarm(farmContract.address); 

    // Transfer Ownership
    await vaultContract.transferOwnership(owner.address);
    await farmContract.transferOwnership(owner.address);

    // Intitialize starting balances
    vaultTokensSupply = await tokenContract.balanceOf(vaultContract.address);
    farmTokensSupply = await tokenContract.balanceOf(farmContract.address);    
    ownerTokenSupply  = await tokenContract.balanceOf(owner.address);
    //tokensPerEth = await vendorContract.tokensPerEth();
  });


  describe('Check Initial Token Amount', () => {
    it('Initial value is 75,000,000', async () => {
      const balance = await tokenContract.balanceOf(vaultContract.address);
      expect(ethers.utils.formatEther(balance)).to.equal('75000000.0');
    });
  });

  describe('Check Emissions', () => {
    it('Emissons 1 token per rate', async () => {      
      const secondsPerToken = await vaultContract.secondsPerToken();
      expect(secondsPerToken).to.equal('475646879756468800');
      
      const t0_emissions=await vaultContract.emissions();

      const blockTime = 4     
      await ethers.provider.send("evm_increaseTime", [blockTime]);
      const totalTime = 2*blockTime;

      await vaultContract.calculateEmissions();
      const t1_emissions=await vaultContract.emissions();
      const secondsPassed = await vaultContract.secondsPassed();  

      const expecteedEmissions = "21.023999999999999892"
      expect(utils.formatEther(t1_emissions)).to.equal(expecteedEmissions);
      });    

      it('Emissions do not exceed balance', async () => {
        // Seconds in 5 year: 5*365*24*3600 = 157,680,000
        const seconsIn5Years = 200000000;
        await ethers.provider.send("evm_increaseTime", [seconsIn5Years]);
        await expect(vaultContract.calculateEmissions());         

        let t1_emissions=await vaultContract.emissions();
        t1_emissions = utils.formatEther(t1_emissions);
        expect(t1_emissions.toString()).to.equal("75000000.0");
      });


    it('Anyone can call calculateEmissions()', async () => {
      // t0=1s, blocktime=5s
      // Total time increase = t0 + increaseTime + 1*blocktime = 10s
      const expecteedEmissions = "21.023999999999999892"   
      const increaseTime = 4; //[s]
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      await vaultContract.connect(addr1).calculateEmissions();
      const emissions1 = await vaultContract.emissions();
   
      expect(utils.formatEther(emissions1)).to.equal(expecteedEmissions);
    });
  });

  describe('Test assignFarm() method', () => {
    it('Check Farm Address', async () => {    
      const vaultFarmAddress = await vaultContract.farmAddress();          
      const farmAddress = await farmContract.address;
      expect(vaultFarmAddress).to.equal(farmAddress);      
    });

    it('assignFarm reverted because called by not the owner', async () => {
      await expect(
        vaultContract.connect(addr1).assignFarm(addr1.address))
        .to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('assignFarm success', async () => {
      await vaultContract.connect(owner).assignFarm(owner.address);
      const newFarmAddress = await vaultContract.farmAddress();
      expect(newFarmAddress).to.equal(owner.address);
    });       
    
    // it('assignFarm sends all emissions to previous farm on Call', async () => {
    //   const blockTime = 5     
    //   await ethers.provider.send("evm_increaseTime", [blockTime]);
    //   await vaultContract.calculateEmissions();
    //   const emissions = await vaultContract.emissions();
    //   const expectedEmissions = "21.023999999999999892"
    //   //expect(utils.formatEther(t1_emissions)).to.equal(expectedEmissions);

    //   await vaultContract.connect(owner).assignFarm(owner.address);
    //   const newEmissions = await vaultContract.emissions();
    //   const oldFarmBalance = await tokenContract.balanceOf(farmContract.address);

    //   console.log("Old Emissions", utils.formatEther(emissions));
    //   console.log("Expected Emissions", expectedEmissions);

      
    //   console.log("New Emissions should be 0", (newEmissions).toString());
    //   console.log("Old Farm Balance", utils.formatEther(oldFarmBalance));

    //   const newFarmAddress = await vaultContract.farmAddress();
    //   //expect(newFarmAddress).to.equal(owner.address);

    // });  
  });

  describe('Test sendToFarm() method', () => {
    it('Check Send Emissions to Farm', async () => {
      // t0=1s, blocktime=5s
      // Total time increase = t0 + increaseTime + 1*blocktime = 10s
      const expectedEmissions = "21.023999999999999892"      
      const increaseTime = 4;
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      
      await vaultContract.sendToFarm();                

      const farmBalance = await tokenContract.balanceOf(farmContract.address);      
      expect(utils.formatEther(farmBalance)).to.equal(expectedEmissions);
            
      const emissions = await vaultContract.emissions();
      expect(utils.formatEther(emissions)).to.equal('0.0');
    });
  });

});



      //const expecteedEmissions = BigNumber.from((utils.formatEther(secondsPassed.div(secondsPerToken))).toString());
      //const expecteedEmissions =  utils.parseEther((secondsPassed.div(secondsPerToken)).toString() );
      // expecteedEmissions = (10*10**18)/475646879756468800)


      // const balance = BigNumber.from('475646879756468800');
      // // const timePassed = BigNumber.from(totalTime);
      // // const expecteedEmissions = timePassed.div(secondsPerToken);

      // const remainder = t1_emissions.mod(1e15);
      // console.log(utils.formatEther(t1_emissions.sub(remainder)));

      // // Round decimals
      // let res = utils.formatEther(t1_emissions);
      // res = Math.round(res * 1e2) / 1e1;
      // const roundedT1Emissions=BigNumber.from((res*10**18).toString())
      // console.log(roundedT1Emissions.toString());