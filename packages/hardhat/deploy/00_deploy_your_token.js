// deploy/00_deploy_your_contract.js

const { ethers } = require("hardhat");
const { BigNumber, providers, Wallet } = require('ethers')
const { Bridge } = require('arb-ts')
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
require('dotenv').config()
requireEnvVariables(['DEVNET_PRIVKEY', 'L2RPC', 'L1RPC'])


module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

  await deploy("CrownToken", {
    // Learn more about args here: https://www.npmjs.com/package/hardhat-deploy#deploymentsdeploy
    from: deployer,
    // args: [ "Hello", ethers.utils.parseEther("1.5") ],
    log: true,
  });

  //const crownToken = await ethers.getContract("CrownToken", deployer);

  // Todo: transfer tokens to frontend address
  // const result = await yourToken.transfer(
  //   "0x69dA48Df7177bc57639F1015E3B9a00f96f7c1d1", 
  //   ethers.utils.parseEther("1000") );

  // ToDo: To take ownership of yourContract using the ownable library uncomment next line and add the
  // address you want to be the owner.
  // yourToken.transferOwnership("0x69dA48Df7177bc57639F1015E3B9a00f96f7c1d1");

  // if you want to instantiate a version of a contract at a specific address!
  // const yourContract = await ethers.getContractAt('YourContract', "0xaAC799eC2d00C013f1F11c37E654e59B0429DF6A");

  // If you want to send value to an address from the deployer
  // const deployerWallet = ethers.provider.getSigner()
  // await deployerWallet.sendTransaction({
  //   to: "0x34aA3F359A9D614239015126635CE7732c18fDF3",
  //   value: ethers.utils.parseEther("500")
  // })

  // If you want to send some ETH to a contract on deploy (make your constructor payable!);
  // const yourContract = await deploy("YourContract", [], {
  // value: ethers.utils.parseEther("0.05")
  // });

  // If you want to link a library into your contract:
  // const yourContract = await deploy("YourContract", [], {}, {
  //  LibraryName: **LibraryAddress**
  // });

  // ToDo: Verify your contract with Etherscan for public chains
  // if (chainId !== "31337") {
  //   try {
  //     console.log(" 🎫 Verifing Contract on Etherscan... ");
  //     await sleep( 5000 ) // wait 5 seconds for deployment to propagate
  //     await run("verify:verify", {
  //       address: yourToken.address,
  //       contract: "contracts/YourToken.sol:YourToken",
  //       contractArguments: [],
  //     });
  //   } catch (e) {
  //     console.log(" ⚠️ Failed to verify contract on Etherscan ");
  //   }
  // }
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// module.exports.tags = ["YourToken"];
