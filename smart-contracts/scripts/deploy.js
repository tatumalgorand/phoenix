const hre = require("hardhat");

async function main() {
  console.log("Deploying GBPR Stablecoin System...");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy GBPR Token
  console.log("\n1. Deploying GBPR Token...");
  const GBPRToken = await hre.ethers.getContractFactory("GBPRToken");
  const gbprToken = await GBPRToken.deploy(deployer.address); // deployer as initial fee collector
  await gbprToken.waitForDeployment();
  const gbprTokenAddress = await gbprToken.getAddress();
  console.log("GBPR Token deployed to:", gbprTokenAddress);

  // Deploy Account Factory
  console.log("\n2. Deploying Account Factory...");
  const AccountFactory = await hre.ethers.getContractFactory("AccountFactory");
  const accountCreationFee = hre.ethers.parseEther("0.001"); // 0.001 ETH fee
  const accountFactory = await AccountFactory.deploy(gbprTokenAddress, accountCreationFee);
  await accountFactory.waitForDeployment();
  const accountFactoryAddress = await accountFactory.getAddress();
  console.log("Account Factory deployed to:", accountFactoryAddress);

  // Summary
  console.log("\n=== Deployment Summary ===");
  console.log("GBPR Token:", gbprTokenAddress);
  console.log("Account Factory:", accountFactoryAddress);
  console.log("Account Creation Fee:", hre.ethers.formatEther(accountCreationFee), "ETH");
  console.log("\nSave these addresses for future interactions!");

  // Verify instructions
  console.log("\n=== Verification Instructions ===");
  console.log("To verify on Etherscan (if deployed to a public network):");
  console.log(`npx hardhat verify --network <network-name> ${gbprTokenAddress} ${deployer.address}`);
  console.log(`npx hardhat verify --network <network-name> ${accountFactoryAddress} ${gbprTokenAddress} ${accountCreationFee}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
