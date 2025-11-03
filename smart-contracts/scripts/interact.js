/**
 * Example script showing how to interact with deployed GBPR contracts
 * 
 * Usage:
 * 1. Deploy contracts first: npx hardhat run scripts/deploy.js --network <network>
 * 2. Update CONTRACT_ADDRESSES below with deployed addresses
 * 3. Run: npx hardhat run scripts/interact.js --network <network>
 */

const hre = require("hardhat");

// UPDATE THESE WITH YOUR DEPLOYED CONTRACT ADDRESSES
const CONTRACT_ADDRESSES = {
  gbprToken: "0x...", // Replace with your deployed GBPRToken address
  accountFactory: "0x..." // Replace with your deployed AccountFactory address
};

async function main() {
  console.log("=== GBPR Contract Interaction Examples ===\n");

  const [owner, user1, user2] = await hre.ethers.getSigners();
  console.log("Interacting as:", owner.address);

  // Get contract instances
  const gbprToken = await hre.ethers.getContractAt("GBPRToken", CONTRACT_ADDRESSES.gbprToken);
  const accountFactory = await hre.ethers.getContractAt("AccountFactory", CONTRACT_ADDRESSES.accountFactory);

  // Example 1: Check GBPR Token Info
  console.log("\n--- GBPR Token Information ---");
  const name = await gbprToken.name();
  const symbol = await gbprToken.symbol();
  const totalSupply = await gbprToken.totalSupply();
  const feeCollector = await gbprToken.feeCollector();
  
  console.log("Name:", name);
  console.log("Symbol:", symbol);
  console.log("Total Supply:", hre.ethers.formatEther(totalSupply), "GBPR");
  console.log("Fee Collector:", feeCollector);

  // Example 2: Create User Account
  console.log("\n--- Creating User Account ---");
  const creationFee = await accountFactory.accountCreationFee();
  console.log("Account Creation Fee:", hre.ethers.formatEther(creationFee), "ETH");
  
  const hasAccount = await accountFactory.hasAccount(owner.address);
  if (!hasAccount) {
    console.log("Creating account...");
    const tx = await accountFactory.createMyAccount({ value: creationFee });
    await tx.wait();
    console.log("Account created!");
  } else {
    console.log("Account already exists");
  }

  const accountAddress = await accountFactory.getAccount(owner.address);
  console.log("User Account Address:", accountAddress);

  // Example 3: Mint GBPR Tokens
  console.log("\n--- Minting GBPR Tokens ---");
  const mintAmount = hre.ethers.parseEther("1000");
  console.log("Minting", hre.ethers.formatEther(mintAmount), "GBPR to", accountAddress);
  
  const isMinter = await gbprToken.minters(owner.address);
  if (isMinter) {
    const mintTx = await gbprToken.mint(accountAddress, mintAmount);
    await mintTx.wait();
    console.log("Minted successfully!");
  } else {
    console.log("Warning: Owner is not a minter. Add minter first.");
  }

  const accountBalance = await gbprToken.balanceOf(accountAddress);
  console.log("Account Balance:", hre.ethers.formatEther(accountBalance), "GBPR");

  // Example 4: Withdraw GBPR from User Account to Personal Wallet
  console.log("\n--- Withdrawing GBPR to Personal Wallet ---");
  const userAccount = await hre.ethers.getContractAt("UserAccount", accountAddress);
  const withdrawAmount = hre.ethers.parseEther("100");
  
  console.log("Withdrawing", hre.ethers.formatEther(withdrawAmount), "GBPR...");
  const withdrawTx = await userAccount.withdrawToken(
    CONTRACT_ADDRESSES.gbprToken,
    owner.address,
    withdrawAmount
  );
  await withdrawTx.wait();
  console.log("Withdrawal successful!");

  const personalBalance = await gbprToken.balanceOf(owner.address);
  console.log("Personal Wallet Balance:", hre.ethers.formatEther(personalBalance), "GBPR");

  // Example 5: Transfer GBPR (with 0.1% fee)
  console.log("\n--- Transferring GBPR ---");
  const transferAmount = hre.ethers.parseEther("50");
  const expectedFee = transferAmount * BigInt(10) / BigInt(10000);
  const expectedReceived = transferAmount - expectedFee;

  console.log("Transferring", hre.ethers.formatEther(transferAmount), "GBPR to user2");
  console.log("Expected fee:", hre.ethers.formatEther(expectedFee), "GBPR");
  console.log("Expected received:", hre.ethers.formatEther(expectedReceived), "GBPR");

  const transferTx = await gbprToken.transfer(user2.address, transferAmount);
  await transferTx.wait();
  console.log("Transfer successful!");

  const user2Balance = await gbprToken.balanceOf(user2.address);
  console.log("User2 Balance:", hre.ethers.formatEther(user2Balance), "GBPR");

  // Example 6: Check Total Fees Collected
  console.log("\n--- Fee Statistics ---");
  const totalFeesCollected = await gbprToken.totalFeesCollected();
  const feeCollectorBalance = await gbprToken.balanceOf(feeCollector);
  
  console.log("Total Fees Collected:", hre.ethers.formatEther(totalFeesCollected), "GBPR");
  console.log("Fee Collector Balance:", hre.ethers.formatEther(feeCollectorBalance), "GBPR");

  // Example 7: Deposit ETH to User Account
  console.log("\n--- Depositing ETH to User Account ---");
  const ethDepositAmount = hre.ethers.parseEther("0.1");
  
  console.log("Depositing", hre.ethers.formatEther(ethDepositAmount), "ETH...");
  const ethDepositTx = await owner.sendTransaction({
    to: accountAddress,
    value: ethDepositAmount
  });
  await ethDepositTx.wait();
  console.log("ETH deposited!");

  const accountEthBalance = await userAccount.getETHBalance();
  console.log("Account ETH Balance:", hre.ethers.formatEther(accountEthBalance), "ETH");

  // Example 8: Check Account Factory Stats
  console.log("\n--- Account Factory Statistics ---");
  const totalAccounts = await accountFactory.getAccountCount();
  console.log("Total Accounts Created:", totalAccounts.toString());

  // Example 9: Query Deposit History
  console.log("\n--- Account Deposit History ---");
  const depositCount = await userAccount.getDepositCount();
  console.log("Total Deposits:", depositCount.toString());
  
  if (depositCount > BigInt(0)) {
    for (let i = 0; i < Math.min(Number(depositCount), 5); i++) {
      const deposit = await userAccount.getDeposit(i);
      console.log(`Deposit ${i + 1}:`, {
        token: deposit[0],
        amount: deposit[0] === "0x0000000000000000000000000000000000000000" 
          ? hre.ethers.formatEther(deposit[1]) + " ETH"
          : hre.ethers.formatEther(deposit[1]) + " tokens",
        timestamp: new Date(Number(deposit[2]) * 1000).toISOString()
      });
    }
  }

  console.log("\n=== Interaction Examples Complete ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
