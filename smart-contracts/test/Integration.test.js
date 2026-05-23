const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GBPR System Integration", function () {
  let gbprToken;
  let accountFactory;
  let owner;
  let systemOwner;
  let user1;
  let user2;
  let feeCollector;

  beforeEach(async function () {
    [owner, systemOwner, user1, user2, feeCollector] = await ethers.getSigners();

    // Deploy GBPR Token
    const GBPRToken = await ethers.getContractFactory("GBPRToken");
    gbprToken = await GBPRToken.deploy(feeCollector.address);
    await gbprToken.waitForDeployment();

    // Deploy Account Factory
    const AccountFactory = await ethers.getContractFactory("AccountFactory");
    const creationFee = ethers.parseEther("0.001");
    accountFactory = await AccountFactory.deploy(await gbprToken.getAddress(), creationFee);
    await accountFactory.waitForDeployment();
  });

  describe("Complete User Journey", function () {
    it("Should complete full user onboarding and transaction flow", async function () {
      // Step 1: User creates an account
      const creationFee = await accountFactory.accountCreationFee();
      await accountFactory.connect(user1).createMyAccount({ value: creationFee });
      
      const userAccountAddress = await accountFactory.getAccount(user1.address);
      expect(userAccountAddress).to.not.equal(ethers.ZeroAddress);
      
      const UserAccount = await ethers.getContractFactory("UserAccount");
      const userAccount = UserAccount.attach(userAccountAddress);

      // Step 2: System mints GBPR to user account (simulating fiat deposit)
      const mintAmount = ethers.parseEther("1000"); // 1000 GBPR
      await gbprToken.mint(userAccountAddress, mintAmount);
      
      expect(await gbprToken.balanceOf(userAccountAddress)).to.equal(mintAmount);

      // Step 3: User withdraws some GBPR to their personal wallet
      const withdrawAmount = ethers.parseEther("100");
      await userAccount.connect(user1).withdrawToken(
        await gbprToken.getAddress(),
        user1.address,
        withdrawAmount
      );

      // Verify balances after withdrawal
      expect(await gbprToken.balanceOf(user1.address)).to.be.gt(0); // Has some GBPR (minus fee)
      
      // Step 4: User transfers GBPR to another user (with 0.1% fee)
      const transferAmount = ethers.parseEther("50");
      await gbprToken.connect(user1).transfer(user2.address, transferAmount);
      
      const expectedFee = transferAmount * BigInt(10) / BigInt(10000);
      const expectedReceived = transferAmount - expectedFee;
      
      expect(await gbprToken.balanceOf(user2.address)).to.equal(expectedReceived);
      expect(await gbprToken.balanceOf(feeCollector.address)).to.be.gt(0);
    });

    it("Should handle crypto deposits correctly", async function () {
      // Create user account
      const creationFee = await accountFactory.accountCreationFee();
      await accountFactory.connect(user1).createMyAccount({ value: creationFee });
      
      const userAccountAddress = await accountFactory.getAccount(user1.address);
      const UserAccount = await ethers.getContractFactory("UserAccount");
      const userAccount = UserAccount.attach(userAccountAddress);

      // User deposits ETH
      const ethDepositAmount = ethers.parseEther("1");
      await user1.sendTransaction({
        to: userAccountAddress,
        value: ethDepositAmount
      });

      expect(await userAccount.getETHBalance()).to.equal(ethDepositAmount);

      // User withdraws ETH
      const withdrawAmount = ethers.parseEther("0.5");
      const initialBalance = await ethers.provider.getBalance(user2.address);
      
      await userAccount.connect(user1).withdrawETH(user2.address, withdrawAmount);
      
      expect(await ethers.provider.getBalance(user2.address)).to.equal(
        initialBalance + withdrawAmount
      );
    });

    it("Should handle multiple users and accounts", async function () {
      const creationFee = await accountFactory.accountCreationFee();
      
      // Create accounts for both users
      await accountFactory.connect(user1).createMyAccount({ value: creationFee });
      await accountFactory.connect(user2).createMyAccount({ value: creationFee });
      
      expect(await accountFactory.getAccountCount()).to.equal(2);
      
      const user1AccountAddress = await accountFactory.getAccount(user1.address);
      const user2AccountAddress = await accountFactory.getAccount(user2.address);
      
      expect(user1AccountAddress).to.not.equal(ethers.ZeroAddress);
      expect(user2AccountAddress).to.not.equal(ethers.ZeroAddress);
      expect(user1AccountAddress).to.not.equal(user2AccountAddress);
    });

    it("Should accumulate fees correctly across multiple transactions", async function () {
      // Mint tokens to user1
      const mintAmount = ethers.parseEther("1000");
      await gbprToken.mint(user1.address, mintAmount);

      const initialFeeBalance = await gbprToken.balanceOf(feeCollector.address);
      
      // Make 5 transfers
      const transferAmount = ethers.parseEther("10");
      for (let i = 0; i < 5; i++) {
        await gbprToken.connect(user1).transfer(user2.address, transferAmount);
      }

      const expectedTotalFees = transferAmount * BigInt(10) / BigInt(10000) * BigInt(5);
      const finalFeeBalance = await gbprToken.balanceOf(feeCollector.address);
      
      expect(finalFeeBalance - initialFeeBalance).to.equal(expectedTotalFees);
      expect(await gbprToken.totalFeesCollected()).to.equal(expectedTotalFees);
    });
  });

  describe("System Owner Capabilities", function () {
    it("Should allow system owner to manage user accounts", async function () {
      // Create user account
      const creationFee = await accountFactory.accountCreationFee();
      await accountFactory.connect(user1).createMyAccount({ value: creationFee });
      
      const userAccountAddress = await accountFactory.getAccount(user1.address);
      const UserAccount = await ethers.getContractFactory("UserAccount");
      const userAccount = UserAccount.attach(userAccountAddress);

      // Mint GBPR to account
      const mintAmount = ethers.parseEther("1000");
      await gbprToken.mint(userAccountAddress, mintAmount);

      // System owner (factory owner) can withdraw on behalf of user
      await accountFactory.transferOwnership(systemOwner.address);
      
      // Need to update system owner in user account
      await userAccount.connect(owner).setSystemOwner(systemOwner.address);
      
      const withdrawAmount = ethers.parseEther("100");
      await userAccount.connect(systemOwner).withdrawToken(
        await gbprToken.getAddress(),
        user2.address,
        withdrawAmount
      );

      expect(await gbprToken.balanceOf(user2.address)).to.be.gt(0);
    });

    it("Should allow owner to change fee collector", async function () {
      const newFeeCollector = user2.address;
      await gbprToken.setFeeCollector(newFeeCollector);
      
      expect(await gbprToken.feeCollector()).to.equal(newFeeCollector);
      
      // Mint and transfer to verify new fee collector
      await gbprToken.mint(user1.address, ethers.parseEther("1000"));
      await gbprToken.connect(user1).transfer(user2.address, ethers.parseEther("100"));
      
      expect(await gbprToken.balanceOf(newFeeCollector)).to.be.gt(0);
    });
  });

  describe("Edge Cases and Security", function () {
    it("Should prevent duplicate account creation", async function () {
      const creationFee = await accountFactory.accountCreationFee();
      
      await accountFactory.connect(user1).createMyAccount({ value: creationFee });
      
      await expect(
        accountFactory.connect(user1).createMyAccount({ value: creationFee })
      ).to.be.revertedWith("Account already exists for user");
    });

    it("Should prevent unauthorized withdrawals", async function () {
      // Create user account
      const creationFee = await accountFactory.accountCreationFee();
      await accountFactory.connect(user1).createMyAccount({ value: creationFee });
      
      const userAccountAddress = await accountFactory.getAccount(user1.address);
      const UserAccount = await ethers.getContractFactory("UserAccount");
      const userAccount = UserAccount.attach(userAccountAddress);

      // Mint tokens
      await gbprToken.mint(userAccountAddress, ethers.parseEther("1000"));

      // User2 tries to withdraw from user1's account
      await expect(
        userAccount.connect(user2).withdrawToken(
          await gbprToken.getAddress(),
          user2.address,
          ethers.parseEther("100")
        )
      ).to.be.revertedWith("Not authorized");
    });

    it("Should handle blacklisted addresses correctly", async function () {
      // Mint tokens to user1
      await gbprToken.mint(user1.address, ethers.parseEther("1000"));

      // Blacklist user1
      await gbprToken.blacklist(user1.address);

      // User1 cannot transfer
      await expect(
        gbprToken.connect(user1).transfer(user2.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Address is blacklisted");

      // Unblacklist and try again
      await gbprToken.unBlacklist(user1.address);
      await gbprToken.connect(user1).transfer(user2.address, ethers.parseEther("100"));
      
      expect(await gbprToken.balanceOf(user2.address)).to.be.gt(0);
    });

    it("Should prevent transfers to blacklisted addresses", async function () {
      await gbprToken.mint(user1.address, ethers.parseEther("1000"));
      await gbprToken.blacklist(user2.address);

      await expect(
        gbprToken.connect(user1).transfer(user2.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Address is blacklisted");
    });
  });

  describe("Gas Optimization", function () {
    it("Should have reasonable gas costs for common operations", async function () {
      // Account creation
      const creationFee = await accountFactory.accountCreationFee();
      const createTx = await accountFactory.connect(user1).createMyAccount({ value: creationFee });
      const createReceipt = await createTx.wait();
      console.log("Account creation gas:", createReceipt.gasUsed.toString());

      // Minting
      const mintTx = await gbprToken.mint(user1.address, ethers.parseEther("1000"));
      const mintReceipt = await mintTx.wait();
      console.log("Minting gas:", mintReceipt.gasUsed.toString());

      // Transfer
      const transferTx = await gbprToken.connect(user1).transfer(user2.address, ethers.parseEther("100"));
      const transferReceipt = await transferTx.wait();
      console.log("Transfer gas:", transferReceipt.gasUsed.toString());
    });
  });
});
