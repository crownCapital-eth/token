// deploy/01_deploy_vault.js
const { ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

  // Get the previously deployed crownToken and Farm
  const crownToken = await ethers.getContract("CrownToken", deployer);
  const argz = [crownToken.address];

  // Deploy the vault
  await deploy("Vault", {
    from: deployer,
    args: argz, // Learn more about args here: https://www.npmjs.com/package/hardhat-deploy#deploymentsdeploy
    log: true,
  });

  const vault = await ethers.getContract("Vault", deployer);
  const DAO_multisig="0x69dA48Df7177bc57639F1015E3B9a00f96f7c1d1"; 

  // Transfer the tokens to the vault
  console.log("\n 🏵  Send 75% of tokens (75,000,000) to the vault...\n");

  const transferTransaction1 = await crownToken.transfer(
    vault.address,
    ethers.utils.parseEther("75000000")
  );
  console.log("\n    ✅ confirming transfer...\n");
  await sleep(15000); // wait seconds for transaction to propagate

  // Transfer the tokens to the vault
  console.log("\n 🏵  Send 25% of tokens (25,000,000) to DAO Multisig...\n");

  const transferTransaction2 = await crownToken.transfer(
    DAO_multisig,
    ethers.utils.parseEther("25000000")
  );
  console.log("\n    ✅ confirming transfer...\n");
  await sleep(15000); // wait 15 seconds for transaction to propagate

  // Change address to DAO Multisig
  console.log("\n 🤹  Sending Vault ownership to DAO Multisig...\n")
  const ownershipTransaction = await vault.transferOwnership(DAO_multisig);
  console.log("\n    ✅ confirming...\n");
  const ownershipResult = await ownershipTransaction.wait();

    // Verify your contract with Etherscan for public chains
    if (chainId !== "31337") {
      try {
        console.log(" 🎫 Verifing Contract on Etherscan... ");
        await sleep( 60000 ) // wait seconds for deployment to propagate
        await run("verify:verify", {
          address: vault.address,
          contract: "contracts/Vault.sol:Vault",
          constructorArguments: argz,
        });
      } catch (e) {
        console.log(" ⚠️ Failed to verify contract on Etherscan ");
        console.log(e);
      }
    }    
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports.tags = ["Vault"];