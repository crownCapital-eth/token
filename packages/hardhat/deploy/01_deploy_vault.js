// deploy/01_deploy_vault.js

const { ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

  // Get the previously deployed crownToken and Farm
  const crownToken = await ethers.getContract("CrownToken", deployer);


  // Deploy the vault
  await deploy("Vault", {
    from: deployer,
    args: [crownToken.address], // Learn more about args here: https://www.npmjs.com/package/hardhat-deploy#deploymentsdeploy
    log: true,
  });

  const vault = await ethers.getContract("Vault", deployer);


  // Transfer the tokens to the vault
  console.log("\n 🏵  Send 75% of tokens to the vault...\n");

  const transferTransaction1 = await crownToken.transfer(
    vault.address,
    ethers.utils.parseEther("750")
  );
  console.log("\n    ✅ confirming transfer...\n");
  await sleep(1000); // wait 1 seconds for transaction to propagate

  // Transfer the tokens to the vault
  console.log("\n 🏵  Send 25% of tokens to DAO Multisig...\n");

  const transferTransaction2 = await crownToken.transfer(
    "0x69dA48Df7177bc57639F1015E3B9a00f96f7c1d1",
    ethers.utils.parseEther("250")
  );
  console.log("\n    ✅ confirming transfer...\n");
  await sleep(1000); // wait 5 seconds for transaction to propagate  

};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports.tags = ["Vault"];
