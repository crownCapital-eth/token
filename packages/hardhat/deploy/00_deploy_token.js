// deploy/00_deploy_token.js

const { ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

  await deploy("CrownToken", {
    // Learn more about args here: https://www.npmjs.com/package/hardhat-deploy#deploymentsdeploy
    from: deployer,
    log: true,
  });

  const crownToken = await ethers.getContract("CrownToken", deployer);

  // Verify your contract with Etherscan for public chains
  if (chainId !== "31337") {
    try {
      console.log(" 🎫 Verifing Contract on Etherscan... ");
      await sleep( 60000 ) // wait seconds for deployment to propagate
      await run("verify:verify", {
        address: crownToken.address,
        contract: "contracts/CrownToken.sol:CrownToken",
      });
    } catch (e) {
      console.log(" ⚠️ Failed to verify contract on Etherscan ");
      console.log(e)      
    }
  }  
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports.tags = ["CrownToken"];
