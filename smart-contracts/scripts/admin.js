/**
 * Administrative tasks for GBPR system
 * 
 * Usage: npx hardhat run scripts/admin.js --network <network>
 */

const hre = require("hardhat");

// UPDATE THESE WITH YOUR DEPLOYED CONTRACT ADDRESSES
const CONTRACT_ADDRESSES = {
  gbprToken: "0x...", // Replace with your deployed GBPRToken address
  accountFactory: "0x..." // Replace with your deployed AccountFactory address
};

async function main() {
  console.log("=== GBPR Administrative Tasks ===\n");

  const [owner] = await hre.ethers.getSigners();
  console.log("Admin address:", owner.address);

  const gbprToken = await hre.ethers.getContractAt("GBPRToken", CONTRACT_ADDRESSES.gbprToken);
  const accountFactory = await hre.ethers.getContractAt("AccountFactory", CONTRACT_ADDRESSES.accountFactory);

  // Show current configuration
  await showConfiguration(gbprToken, accountFactory);

  // Example administrative tasks (uncomment to use)

  // Task 1: Add a minter
  // await addMinter(gbprToken, "0x...");

  // Task 2: Remove a minter
  // await removeMinter(gbprToken, "0x...");

  // Task 3: Change fee collector
  // await changeFeeCollector(gbprToken, "0x...");

  // Task 4: Update account creation fee
  // await updateAccountCreationFee(accountFactory, hre.ethers.parseEther("0.002"));

  // Task 5: Blacklist an address
  // await blacklistAddress(gbprToken, "0x...");

  // Task 6: Unblacklist an address
  // await unblacklistAddress(gbprToken, "0x...");

  // Task 7: Withdraw collected fees from factory
  // await withdrawFactoryFees(accountFactory, owner.address);

  // Task 8: Emergency token withdrawal from factory
  // await emergencyWithdraw(accountFactory, CONTRACT_ADDRESSES.gbprToken, owner.address, hre.ethers.parseEther("100"));

  console.log("\n=== Administrative Tasks Complete ===");
}

async function showConfiguration(gbprToken, accountFactory) {
  console.log("\n--- Current Configuration ---");
  
  // GBPR Token Info
  console.log("\nGBPR Token:");
  console.log("  Address:", await gbprToken.getAddress());
  console.log("  Owner:", await gbprToken.owner());
  console.log("  Fee Collector:", await gbprToken.feeCollector());
  console.log("  Total Supply:", hre.ethers.formatEther(await gbprToken.totalSupply()), "GBPR");
  console.log("  Total Fees Collected:", hre.ethers.formatEther(await gbprToken.totalFeesCollected()), "GBPR");
  
  // Account Factory Info
  console.log("\nAccount Factory:");
  console.log("  Address:", await accountFactory.getAddress());
  console.log("  Owner:", await accountFactory.owner());
  console.log("  Creation Fee:", hre.ethers.formatEther(await accountFactory.accountCreationFee()), "ETH");
  console.log("  Total Accounts:", (await accountFactory.getAccountCount()).toString());
  console.log("  Balance:", hre.ethers.formatEther(await accountFactory.getBalance()), "ETH");
}

async function addMinter(gbprToken, minterAddress) {
  console.log(`\n--- Adding Minter: ${minterAddress} ---`);
  
  const isMinter = await gbprToken.minters(minterAddress);
  if (isMinter) {
    console.log("Address is already a minter");
    return;
  }

  const tx = await gbprToken.addMinter(minterAddress);
  console.log("Transaction sent:", tx.hash);
  await tx.wait();
  console.log("Minter added successfully!");
}

async function removeMinter(gbprToken, minterAddress) {
  console.log(`\n--- Removing Minter: ${minterAddress} ---`);
  
  const isMinter = await gbprToken.minters(minterAddress);
  if (!isMinter) {
    console.log("Address is not a minter");
    return;
  }

  const tx = await gbprToken.removeMinter(minterAddress);
  console.log("Transaction sent:", tx.hash);
  await tx.wait();
  console.log("Minter removed successfully!");
}

async function changeFeeCollector(gbprToken, newFeeCollector) {
  console.log(`\n--- Changing Fee Collector to: ${newFeeCollector} ---`);
  
  const currentFeeCollector = await gbprToken.feeCollector();
  console.log("Current fee collector:", currentFeeCollector);
  
  if (currentFeeCollector.toLowerCase() === newFeeCollector.toLowerCase()) {
    console.log("New fee collector is same as current");
    return;
  }

  const tx = await gbprToken.setFeeCollector(newFeeCollector);
  console.log("Transaction sent:", tx.hash);
  await tx.wait();
  console.log("Fee collector changed successfully!");
  console.log("New fee collector:", await gbprToken.feeCollector());
}

async function updateAccountCreationFee(accountFactory, newFee) {
  console.log(`\n--- Updating Account Creation Fee to: ${hre.ethers.formatEther(newFee)} ETH ---`);
  
  const currentFee = await accountFactory.accountCreationFee();
  console.log("Current fee:", hre.ethers.formatEther(currentFee), "ETH");

  const tx = await accountFactory.setAccountCreationFee(newFee);
  console.log("Transaction sent:", tx.hash);
  await tx.wait();
  console.log("Account creation fee updated successfully!");
  console.log("New fee:", hre.ethers.formatEther(await accountFactory.accountCreationFee()), "ETH");
}

async function blacklistAddress(gbprToken, address) {
  console.log(`\n--- Blacklisting Address: ${address} ---`);
  
  const isBlacklisted = await gbprToken.blacklisted(address);
  if (isBlacklisted) {
    console.log("Address is already blacklisted");
    return;
  }

  const tx = await gbprToken.blacklist(address);
  console.log("Transaction sent:", tx.hash);
  await tx.wait();
  console.log("Address blacklisted successfully!");
}

async function unblacklistAddress(gbprToken, address) {
  console.log(`\n--- Removing Address from Blacklist: ${address} ---`);
  
  const isBlacklisted = await gbprToken.blacklisted(address);
  if (!isBlacklisted) {
    console.log("Address is not blacklisted");
    return;
  }

  const tx = await gbprToken.unBlacklist(address);
  console.log("Transaction sent:", tx.hash);
  await tx.wait();
  console.log("Address removed from blacklist successfully!");
}

async function withdrawFactoryFees(accountFactory, recipient) {
  console.log(`\n--- Withdrawing Factory Fees to: ${recipient} ---`);
  
  const balance = await accountFactory.getBalance();
  console.log("Factory balance:", hre.ethers.formatEther(balance), "ETH");

  if (balance === BigInt(0)) {
    console.log("No fees to withdraw");
    return;
  }

  const tx = await accountFactory.withdrawFees(recipient, balance);
  console.log("Transaction sent:", tx.hash);
  await tx.wait();
  console.log("Fees withdrawn successfully!");
}

async function emergencyWithdraw(accountFactory, tokenAddress, recipient, amount) {
  console.log(`\n--- Emergency Token Withdrawal ---`);
  console.log("Token:", tokenAddress);
  console.log("Recipient:", recipient);
  console.log("Amount:", hre.ethers.formatEther(amount));

  // This would require adding an emergency withdraw function to the factory contract
  console.log("Note: Emergency withdraw function not implemented in current contract");
  console.log("Consider adding this functionality for production deployment");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
