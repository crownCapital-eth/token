// deploy/01_deploy_farm.js

const { ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

  // // You might need the previously deployed crownToken:
  const crownToken = await ethers.getContract("CrownToken", deployer);
  const vault = await ethers.getContract("Vault", deployer);

  // Deploy the Farm
  await deploy("Farm", {
    from: deployer,
    args: [crownToken.address, vault.address],
    log: true,
  });

  const farm = await ethers.getContract("Farm", deployer);


  // Set the farm address to Farm contract
  console.log("\n Set Farm address to Farm Contract\n");
  const setFarmAddress = await vault.initializeFarm(farm.address, 100);
  await vault.setFarms();
  console.log("\n    ✅ confirming farm address...\n");
  await sleep(15000); // wait 15 seconds for transaction to propagate


  // Change address to DAO Multisig
  console.log("\n 🤹  Sending Vault ownership to DAO Multisig...\n")
  const ownershipTransaction = await vault.transferOwnership("0x9A2bC9d6E57684F3FfC26550442655B526b30B09" );
  console.log("\n    ✅ confirming...\n");
  const ownershipResult = await ownershipTransaction.wait();

  console.log("\n 🤹  Sending Farm ownership to DAO Multisig...\n")
  const ownershipTransaction2 = await farm.transferOwnership("0x9A2bC9d6E57684F3FfC26550442655B526b30B09" );
  console.log("\n    ✅ confirming...\n");
  const ownershipResult2 = await ownershipTransaction2.wait();

};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports.tags = ["Vendor"];