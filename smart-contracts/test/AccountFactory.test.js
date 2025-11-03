const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AccountFactory", function () {
  let gbprToken;
  let accountFactory;
  let owner;
  let feeCollector;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, feeCollector, user1, user2] = await ethers.getSigners();

    // Deploy GBPR token
    const GBPRToken = await ethers.getContractFactory("GBPRToken");
    gbprToken = await GBPRToken.deploy(feeCollector.address);
    await gbprToken.waitForDeployment();

    // Deploy AccountFactory
    const AccountFactory = await ethers.getContractFactory("AccountFactory");
    const creationFee = ethers.parseEther("0.01");
    accountFactory = await AccountFactory.deploy(await gbprToken.getAddress(), creationFee);
    await accountFactory.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct GBPR token address", async function () {
      expect(await accountFactory.gbprToken()).to.equal(await gbprToken.getAddress());
    });

    it("Should set the correct account creation fee", async function () {
      expect(await accountFactory.accountCreationFee()).to.equal(ethers.parseEther("0.01"));
    });

    it("Should set the correct owner", async function () {
      expect(await accountFactory.owner()).to.equal(owner.address);
    });
  });

  describe("Account Creation", function () {
    it("Should create a new account for a user", async function () {
      const creationFee = await accountFactory.accountCreationFee();
      
      await expect(accountFactory.createAccount(user1.address, { value: creationFee }))
        .to.emit(accountFactory, "AccountCreated");

      const accountAddress = await accountFactory.getAccount(user1.address);
      expect(accountAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("Should create account via createMyAccount", async function () {
      const creationFee = await accountFactory.accountCreationFee();
      
      await accountFactory.connect(user1).createMyAccount({ value: creationFee });

      const accountAddress = await accountFactory.getAccount(user1.address);
      expect(accountAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("Should fail if account already exists", async function () {
      const creationFee = await accountFactory.accountCreationFee();
      
      await accountFactory.createAccount(user1.address, { value: creationFee });
      
      await expect(
        accountFactory.createAccount(user1.address, { value: creationFee })
      ).to.be.revertedWith("Account already exists for user");
    });

    it("Should fail if insufficient fee", async function () {
      const insufficientFee = ethers.parseEther("0.005");
      
      await expect(
        accountFactory.createAccount(user1.address, { value: insufficientFee })
      ).to.be.revertedWith("Insufficient fee");
    });

    it("Should refund excess payment", async function () {
      const creationFee = await accountFactory.accountCreationFee();
      const excessFee = creationFee + ethers.parseEther("0.01");
      
      const initialBalance = await ethers.provider.getBalance(owner.address);
      
      await accountFactory.createAccount(user1.address, { value: excessFee });
      
      // Check that excess was refunded (approximately, accounting for gas)
      const finalBalance = await ethers.provider.getBalance(owner.address);
      expect(finalBalance).to.be.lt(initialBalance - creationFee);
    });

    it("Should increment account count", async function () {
      const creationFee = await accountFactory.accountCreationFee();
      
      expect(await accountFactory.getAccountCount()).to.equal(0);
      
      await accountFactory.createAccount(user1.address, { value: creationFee });
      expect(await accountFactory.getAccountCount()).to.equal(1);
      
      await accountFactory.createAccount(user2.address, { value: creationFee });
      expect(await accountFactory.getAccountCount()).to.equal(2);
    });

    it("Should store account in allAccounts array", async function () {
      const creationFee = await accountFactory.accountCreationFee();
      
      await accountFactory.createAccount(user1.address, { value: creationFee });
      
      const accountAddress = await accountFactory.getAccountByIndex(0);
      expect(accountAddress).to.equal(await accountFactory.getAccount(user1.address));
    });
  });

  describe("Account Queries", function () {
    beforeEach(async function () {
      const creationFee = await accountFactory.accountCreationFee();
      await accountFactory.createAccount(user1.address, { value: creationFee });
    });

    it("Should return correct account address", async function () {
      const accountAddress = await accountFactory.getAccount(user1.address);
      expect(accountAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("Should return zero address for non-existent account", async function () {
      const accountAddress = await accountFactory.getAccount(user2.address);
      expect(accountAddress).to.equal(ethers.ZeroAddress);
    });

    it("Should correctly report if user has account", async function () {
      expect(await accountFactory.hasAccount(user1.address)).to.equal(true);
      expect(await accountFactory.hasAccount(user2.address)).to.equal(false);
    });

    it("Should return correct account count", async function () {
      expect(await accountFactory.getAccountCount()).to.equal(1);
    });

    it("Should return account by index", async function () {
      const accountAddress = await accountFactory.getAccountByIndex(0);
      expect(accountAddress).to.equal(await accountFactory.getAccount(user1.address));
    });

    it("Should fail to get account with invalid index", async function () {
      await expect(
        accountFactory.getAccountByIndex(999)
      ).to.be.revertedWith("Index out of bounds");
    });
  });

  describe("Fee Management", function () {
    it("Should allow owner to change creation fee", async function () {
      const newFee = ethers.parseEther("0.02");
      
      await accountFactory.setAccountCreationFee(newFee);
      expect(await accountFactory.accountCreationFee()).to.equal(newFee);
    });

    it("Should emit event when fee changes", async function () {
      const oldFee = await accountFactory.accountCreationFee();
      const newFee = ethers.parseEther("0.02");
      
      await expect(accountFactory.setAccountCreationFee(newFee))
        .to.emit(accountFactory, "AccountCreationFeeChanged")
        .withArgs(oldFee, newFee);
    });

    it("Should fail if non-owner tries to change fee", async function () {
      const newFee = ethers.parseEther("0.02");
      
      await expect(
        accountFactory.connect(user1).setAccountCreationFee(newFee)
      ).to.be.reverted;
    });

    it("Should allow owner to withdraw fees", async function () {
      const creationFee = await accountFactory.accountCreationFee();
      
      // Create some accounts to collect fees
      await accountFactory.createAccount(user1.address, { value: creationFee });
      await accountFactory.createAccount(user2.address, { value: creationFee });
      
      const balance = await accountFactory.getBalance();
      expect(balance).to.equal(creationFee * BigInt(2));
      
      await accountFactory.withdrawFees(owner.address, balance);
      expect(await accountFactory.getBalance()).to.equal(0);
    });

    it("Should fail if non-owner tries to withdraw fees", async function () {
      await expect(
        accountFactory.connect(user1).withdrawFees(user1.address, 0)
      ).to.be.reverted;
    });
  });

  describe("GBPR Token Management", function () {
    it("Should allow owner to update GBPR token address", async function () {
      // Deploy a new GBPR token
      const GBPRToken = await ethers.getContractFactory("GBPRToken");
      const newGBPRToken = await GBPRToken.deploy(feeCollector.address);
      await newGBPRToken.waitForDeployment();
      
      await accountFactory.setGBPRToken(await newGBPRToken.getAddress());
      expect(await accountFactory.gbprToken()).to.equal(await newGBPRToken.getAddress());
    });

    it("Should emit event when GBPR token changes", async function () {
      const GBPRToken = await ethers.getContractFactory("GBPRToken");
      const newGBPRToken = await GBPRToken.deploy(feeCollector.address);
      await newGBPRToken.waitForDeployment();
      
      const oldToken = await accountFactory.gbprToken();
      
      await expect(accountFactory.setGBPRToken(await newGBPRToken.getAddress()))
        .to.emit(accountFactory, "GBPRTokenChanged")
        .withArgs(oldToken, await newGBPRToken.getAddress());
    });

    it("Should fail to set zero address as GBPR token", async function () {
      await expect(
        accountFactory.setGBPRToken(ethers.ZeroAddress)
      ).to.be.revertedWith("GBPR token cannot be zero address");
    });

    it("Should fail if non-owner tries to update GBPR token", async function () {
      const GBPRToken = await ethers.getContractFactory("GBPRToken");
      const newGBPRToken = await GBPRToken.deploy(feeCollector.address);
      await newGBPRToken.waitForDeployment();
      
      await expect(
        accountFactory.connect(user1).setGBPRToken(await newGBPRToken.getAddress())
      ).to.be.reverted;
    });
  });

  describe("Integration", function () {
    it("Should create functional user account", async function () {
      const creationFee = await accountFactory.accountCreationFee();
      await accountFactory.createAccount(user1.address, { value: creationFee });
      
      const accountAddress = await accountFactory.getAccount(user1.address);
      
      // Get the UserAccount contract instance
      const UserAccount = await ethers.getContractFactory("UserAccount");
      const userAccount = UserAccount.attach(accountAddress);
      
      // Verify account properties
      expect(await userAccount.owner()).to.equal(user1.address);
      expect(await userAccount.systemOwner()).to.equal(owner.address);
      expect(await userAccount.gbprToken()).to.equal(await gbprToken.getAddress());
    });
  });
});
