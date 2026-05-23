const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("UserAccount", function () {
  let gbprToken;
  let mockToken;
  let userAccount;
  let owner;
  let systemOwner;
  let user;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, systemOwner, user, addr1, addr2] = await ethers.getSigners();

    // Deploy GBPR token
    const GBPRToken = await ethers.getContractFactory("GBPRToken");
    gbprToken = await GBPRToken.deploy(owner.address);
    await gbprToken.waitForDeployment();

    // Deploy a mock ERC20 token for testing
    const MockToken = await ethers.getContractFactory("GBPRToken");
    mockToken = await MockToken.deploy(owner.address);
    await mockToken.waitForDeployment();

    // Mint some tokens for testing
    await mockToken.mint(addr1.address, ethers.parseEther("1000"));

    // Deploy UserAccount
    const UserAccount = await ethers.getContractFactory("UserAccount");
    userAccount = await UserAccount.deploy(
      user.address,
      systemOwner.address,
      await gbprToken.getAddress()
    );
    await userAccount.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await userAccount.owner()).to.equal(user.address);
    });

    it("Should set the correct system owner", async function () {
      expect(await userAccount.systemOwner()).to.equal(systemOwner.address);
    });

    it("Should set the correct GBPR token address", async function () {
      expect(await userAccount.gbprToken()).to.equal(await gbprToken.getAddress());
    });
  });

  describe("Crypto Deposits", function () {
    it("Should allow depositing ERC20 tokens", async function () {
      const depositAmount = ethers.parseEther("100");
      
      // Approve and deposit
      await mockToken.connect(addr1).approve(await userAccount.getAddress(), depositAmount);
      await userAccount.connect(addr1).depositCrypto(await mockToken.getAddress(), depositAmount);

      expect(await userAccount.tokenBalances(await mockToken.getAddress())).to.equal(depositAmount);
    });

    it("Should track deposits correctly", async function () {
      const depositAmount = ethers.parseEther("100");
      
      await mockToken.connect(addr1).approve(await userAccount.getAddress(), depositAmount);
      await userAccount.connect(addr1).depositCrypto(await mockToken.getAddress(), depositAmount);

      expect(await userAccount.getDepositCount()).to.equal(1);
      
      const deposit = await userAccount.getDeposit(0);
      expect(deposit[0]).to.equal(await mockToken.getAddress());
      expect(deposit[1]).to.equal(depositAmount);
    });

    it("Should emit CryptoDeposited event", async function () {
      const depositAmount = ethers.parseEther("100");
      
      await mockToken.connect(addr1).approve(await userAccount.getAddress(), depositAmount);
      
      await expect(userAccount.connect(addr1).depositCrypto(await mockToken.getAddress(), depositAmount))
        .to.emit(userAccount, "CryptoDeposited");
    });

    it("Should receive ETH deposits", async function () {
      const depositAmount = ethers.parseEther("1");
      
      await addr1.sendTransaction({
        to: await userAccount.getAddress(),
        value: depositAmount
      });

      expect(await userAccount.getETHBalance()).to.equal(depositAmount);
    });
  });

  describe("Withdrawals", function () {
    beforeEach(async function () {
      const depositAmount = ethers.parseEther("100");
      await mockToken.connect(addr1).approve(await userAccount.getAddress(), depositAmount);
      await userAccount.connect(addr1).depositCrypto(await mockToken.getAddress(), depositAmount);
    });

    it("Should allow account owner to withdraw tokens", async function () {
      const withdrawAmount = ethers.parseEther("50");
      
      await userAccount.connect(user).withdrawToken(
        await mockToken.getAddress(),
        addr2.address,
        withdrawAmount
      );

      expect(await mockToken.balanceOf(addr2.address)).to.be.gt(0);
    });

    it("Should allow system owner to withdraw tokens", async function () {
      const withdrawAmount = ethers.parseEther("50");
      
      await userAccount.connect(systemOwner).withdrawToken(
        await mockToken.getAddress(),
        addr2.address,
        withdrawAmount
      );

      expect(await mockToken.balanceOf(addr2.address)).to.be.gt(0);
    });

    it("Should fail if unauthorized user tries to withdraw", async function () {
      const withdrawAmount = ethers.parseEther("50");
      
      await expect(
        userAccount.connect(addr1).withdrawToken(
          await mockToken.getAddress(),
          addr2.address,
          withdrawAmount
        )
      ).to.be.revertedWith("Not authorized");
    });

    it("Should fail if insufficient balance", async function () {
      const withdrawAmount = ethers.parseEther("200");
      
      await expect(
        userAccount.connect(user).withdrawToken(
          await mockToken.getAddress(),
          addr2.address,
          withdrawAmount
        )
      ).to.be.revertedWith("Insufficient balance");
    });

    it("Should update balances after withdrawal", async function () {
      const withdrawAmount = ethers.parseEther("50");
      const initialBalance = await userAccount.tokenBalances(await mockToken.getAddress());
      
      await userAccount.connect(user).withdrawToken(
        await mockToken.getAddress(),
        addr2.address,
        withdrawAmount
      );

      expect(await userAccount.tokenBalances(await mockToken.getAddress()))
        .to.equal(initialBalance - withdrawAmount);
    });
  });

  describe("ETH Withdrawals", function () {
    beforeEach(async function () {
      // Send ETH to the account
      await addr1.sendTransaction({
        to: await userAccount.getAddress(),
        value: ethers.parseEther("1")
      });
    });

    it("Should allow account owner to withdraw ETH", async function () {
      const withdrawAmount = ethers.parseEther("0.5");
      const initialBalance = await ethers.provider.getBalance(addr2.address);
      
      await userAccount.connect(user).withdrawETH(addr2.address, withdrawAmount);
      
      expect(await ethers.provider.getBalance(addr2.address)).to.equal(
        initialBalance + withdrawAmount
      );
    });

    it("Should allow system owner to withdraw ETH", async function () {
      const withdrawAmount = ethers.parseEther("0.5");
      const initialBalance = await ethers.provider.getBalance(addr2.address);
      
      await userAccount.connect(systemOwner).withdrawETH(addr2.address, withdrawAmount);
      
      expect(await ethers.provider.getBalance(addr2.address)).to.equal(
        initialBalance + withdrawAmount
      );
    });

    it("Should fail if unauthorized user tries to withdraw ETH", async function () {
      const withdrawAmount = ethers.parseEther("0.5");
      
      await expect(
        userAccount.connect(addr1).withdrawETH(addr2.address, withdrawAmount)
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("System Owner Management", function () {
    it("Should allow system owner to change", async function () {
      await userAccount.connect(systemOwner).setSystemOwner(addr1.address);
      expect(await userAccount.systemOwner()).to.equal(addr1.address);
    });

    it("Should fail if non-system owner tries to change", async function () {
      await expect(
        userAccount.connect(user).setSystemOwner(addr1.address)
      ).to.be.revertedWith("Only system owner can change");
    });
  });

  describe("Balance Queries", function () {
    it("Should return correct token balance", async function () {
      const depositAmount = ethers.parseEther("100");
      await mockToken.connect(addr1).approve(await userAccount.getAddress(), depositAmount);
      await userAccount.connect(addr1).depositCrypto(await mockToken.getAddress(), depositAmount);

      expect(await userAccount.getTokenBalance(await mockToken.getAddress())).to.equal(depositAmount);
    });

    it("Should return correct ETH balance", async function () {
      const depositAmount = ethers.parseEther("1");
      await addr1.sendTransaction({
        to: await userAccount.getAddress(),
        value: depositAmount
      });

      expect(await userAccount.getETHBalance()).to.equal(depositAmount);
    });
  });
});
