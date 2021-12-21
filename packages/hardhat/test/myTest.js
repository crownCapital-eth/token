const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");
const {Contract, BigNumber} = require("ethers");
const { getRsBlockTable } = require("qrcode-terminal/vendor/QRCode/QRRSBlock");
//const { time } = require("@openzeppelin/test-helpers");

use(solidity);

// Utilities methods
const increaseWorldTimeInSeconds = async (seconds, mine = false) => {
  await ethers.provider.send('evm_increaseTime', [seconds]);
  if (mine) {
    await ethers.provider.send('evm_mine', []);
  }
};

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
    await tokenContract.transfer(vaultContract.address, ethers.utils.parseEther('750'));
    await tokenContract.transfer(owner.address, ethers.utils.parseEther('250'));

    // Transfer Ownership
    await vaultContract.transferOwnership(owner.address);
    await farmContract.transferOwnership(owner.address);

    // Intitialize starting balances
    vaultTokensSupply = await tokenContract.balanceOf(vaultContract.address);
    farmTokensSupply = await tokenContract.balanceOf(farmContract.address);    
    ownerTokenSupply  = await tokenContract.balanceOf(owner.address);
    //tokensPerEth = await vendorContract.tokensPerEth();
  });

  describe('Test assignFarm() method', () => {
    it('assignFarm reverted because called by not the owner', async () => {
      await expect(
        vaultContract
        .connect(addr1)
        .assignFarm(addr1.address))
        .to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('assignFarm success', async () => {
      await expect(vaultContract
        .connect(owner)
        .assignFarm(owner.address))
        expect(await vaultContract.farmAddress()).to.equal(owner.address);
    });      
  });

  describe('Test calculateEmissions() method', () => {
    it('Emissons starts at 0', async () => {
      await expect(
        vaultContract
        .connect(owner)
        .calculateEmissions()
        );
        //console.log(msg.sender,"set farm address to", farmAddress);
        expect(await vaultContract.emissions()).to.equal(0);
    });

    it('Emissons 1 token per rate', async () => {      

      const secondsPerToken = (await vaultContract.secondsPerToken()).toNumber();
  
      console.log('Rate', secondsPerToken);
      expect(secondsPerToken).to.equal(10);
      

      const t0_emissions=await vaultContract.emissions();
      console.log('Emissions T0', t0_emissions.toString());

      const blockTime = 5
      
      await ethers.provider.send("evm_increaseTime", [secondsPerToken-blockTime]);

      const emiss = await 
        vaultContract
        .connect(owner)
        .calculateEmissions();

        console.log('Emiss T1', emiss.toString());

        const t1_emissions = await 
        vaultContract
        .connect(owner)
        .getEmissions();

      //const t1_emissions=await vaultContract.emissions();
      console.log('Emissions T1', t1_emissions.toString());
      
      console.log('Seconds', (await vaultContract.secondsPassed()).toString());

      expect(t1_emissions).to.equal(ethers.utils.parseEther('1'));
    });    


  });

});
