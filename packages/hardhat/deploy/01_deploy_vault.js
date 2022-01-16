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
    ethers.utils.parseEther("75000000")
  );
  console.log("\n    ✅ confirming transfer...\n");
  await sleep(15000); // wait 15 seconds for transaction to propagate

  // Transfer the tokens to the vault
  console.log("\n 🏵  Send 25% of tokens to DAO Multisig...\n");

  const transferTransaction2 = await crownToken.transfer(
    "0x9A2bC9d6E57684F3FfC26550442655B526b30B09",
    ethers.utils.parseEther("25000000")
  );
  console.log("\n    ✅ confirming transfer...\n");
  await sleep(15000); // wait 15 seconds for transaction to propagate

};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports.tags = ["Vault"];