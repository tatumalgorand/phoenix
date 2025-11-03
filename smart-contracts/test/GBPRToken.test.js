const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GBPRToken", function () {
  let gbprToken;
  let owner;
  let feeCollector;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, feeCollector, addr1, addr2] = await ethers.getSigners();

    const GBPRToken = await ethers.getContractFactory("GBPRToken");
    gbprToken = await GBPRToken.deploy(feeCollector.address);
    await gbprToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      expect(await gbprToken.name()).to.equal("Great British Pound Reformed");
      expect(await gbprToken.symbol()).to.equal("GBPR");
    });

    it("Should set the right fee collector", async function () {
      expect(await gbprToken.feeCollector()).to.equal(feeCollector.address);
    });

    it("Should set owner as initial minter", async function () {
      expect(await gbprToken.minters(owner.address)).to.equal(true);
    });

    it("Should have 0.1% fee rate", async function () {
      expect(await gbprToken.FEE_BASIS_POINTS()).to.equal(10);
      expect(await gbprToken.BASIS_POINTS_DIVISOR()).to.equal(10000);
    });
  });

  describe("Minting", function () {
    it("Should allow minter to mint tokens", async function () {
      const amount = ethers.parseEther("1000");
      await gbprToken.mint(addr1.address, amount);
      expect(await gbprToken.balanceOf(addr1.address)).to.equal(amount);
    });

    it("Should fail if non-minter tries to mint", async function () {
      const amount = ethers.parseEther("1000");
      await expect(
        gbprToken.connect(addr1).mint(addr2.address, amount)
      ).to.be.revertedWith("Caller is not a minter");
    });

    it("Should allow owner to add minter", async function () {
      await gbprToken.addMinter(addr1.address);
      expect(await gbprToken.minters(addr1.address)).to.equal(true);
    });

    it("Should allow new minter to mint", async function () {
      await gbprToken.addMinter(addr1.address);
      const amount = ethers.parseEther("1000");
      await gbprToken.connect(addr1).mint(addr2.address, amount);
      expect(await gbprToken.balanceOf(addr2.address)).to.equal(amount);
    });

    it("Should allow owner to remove minter", async function () {
      await gbprToken.addMinter(addr1.address);
      await gbprToken.removeMinter(addr1.address);
      expect(await gbprToken.minters(addr1.address)).to.equal(false);
    });
  });

  describe("Transfers with Fee", function () {
    beforeEach(async function () {
      // Mint 1000 tokens to addr1
      const amount = ethers.parseEther("1000");
      await gbprToken.mint(addr1.address, amount);
    });

    it("Should transfer with 0.1% fee deducted", async function () {
      const transferAmount = ethers.parseEther("100");
      const expectedFee = transferAmount * BigInt(10) / BigInt(10000); // 0.1%
      const expectedReceived = transferAmount - expectedFee;

      await gbprToken.connect(addr1).transfer(addr2.address, transferAmount);

      expect(await gbprToken.balanceOf(addr2.address)).to.equal(expectedReceived);
      expect(await gbprToken.balanceOf(feeCollector.address)).to.equal(expectedFee);
    });

    it("Should calculate fee correctly", async function () {
      const amount = ethers.parseEther("100");
      const expectedFee = amount * BigInt(10) / BigInt(10000);
      expect(await gbprToken.calculateFee(amount)).to.equal(expectedFee);
    });

    it("Should track total fees collected", async function () {
      const transferAmount = ethers.parseEther("100");
      const expectedFee = transferAmount * BigInt(10) / BigInt(10000);

      await gbprToken.connect(addr1).transfer(addr2.address, transferAmount);
      expect(await gbprToken.totalFeesCollected()).to.equal(expectedFee);

      // Second transfer
      await gbprToken.connect(addr1).transfer(addr2.address, transferAmount);
      expect(await gbprToken.totalFeesCollected()).to.equal(expectedFee * BigInt(2));
    });

    it("Should emit FeeCollected event", async function () {
      const transferAmount = ethers.parseEther("100");
      const expectedFee = transferAmount * BigInt(10) / BigInt(10000);

      await expect(gbprToken.connect(addr1).transfer(addr2.address, transferAmount))
        .to.emit(gbprToken, "FeeCollected")
        .withArgs(addr1.address, addr2.address, expectedFee);
    });
  });

  describe("TransferFrom with Fee", function () {
    beforeEach(async function () {
      const amount = ethers.parseEther("1000");
      await gbprToken.mint(addr1.address, amount);
    });

    it("Should transferFrom with 0.1% fee deducted", async function () {
      const transferAmount = ethers.parseEther("100");
      const expectedFee = transferAmount * BigInt(10) / BigInt(10000);
      const expectedReceived = transferAmount - expectedFee;

      await gbprToken.connect(addr1).approve(owner.address, transferAmount);
      await gbprToken.transferFrom(addr1.address, addr2.address, transferAmount);

      expect(await gbprToken.balanceOf(addr2.address)).to.equal(expectedReceived);
      expect(await gbprToken.balanceOf(feeCollector.address)).to.equal(expectedFee);
    });
  });

  describe("Fee Collector Management", function () {
    it("Should allow owner to change fee collector", async function () {
      await gbprToken.setFeeCollector(addr1.address);
      expect(await gbprToken.feeCollector()).to.equal(addr1.address);
    });

    it("Should fail if non-owner tries to change fee collector", async function () {
      await expect(
        gbprToken.connect(addr1).setFeeCollector(addr2.address)
      ).to.be.reverted;
    });

    it("Should fail to set zero address as fee collector", async function () {
      await expect(
        gbprToken.setFeeCollector(ethers.ZeroAddress)
      ).to.be.revertedWith("Fee collector cannot be zero address");
    });
  });

  describe("Blacklist", function () {
    beforeEach(async function () {
      const amount = ethers.parseEther("1000");
      await gbprToken.mint(addr1.address, amount);
    });

    it("Should allow owner to blacklist address", async function () {
      await gbprToken.blacklist(addr1.address);
      expect(await gbprToken.blacklisted(addr1.address)).to.equal(true);
    });

    it("Should prevent blacklisted address from transferring", async function () {
      await gbprToken.blacklist(addr1.address);
      await expect(
        gbprToken.connect(addr1).transfer(addr2.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Address is blacklisted");
    });

    it("Should prevent transfer to blacklisted address", async function () {
      await gbprToken.blacklist(addr2.address);
      await expect(
        gbprToken.connect(addr1).transfer(addr2.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Address is blacklisted");
    });

    it("Should allow owner to unblacklist address", async function () {
      await gbprToken.blacklist(addr1.address);
      await gbprToken.unBlacklist(addr1.address);
      expect(await gbprToken.blacklisted(addr1.address)).to.equal(false);
    });

    it("Should allow unblacklisted address to transfer", async function () {
      await gbprToken.blacklist(addr1.address);
      await gbprToken.unBlacklist(addr1.address);
      await gbprToken.connect(addr1).transfer(addr2.address, ethers.parseEther("100"));
      expect(await gbprToken.balanceOf(addr2.address)).to.be.gt(0);
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      const amount = ethers.parseEther("1000");
      await gbprToken.mint(addr1.address, amount);
    });

    it("Should allow token holder to burn tokens", async function () {
      const burnAmount = ethers.parseEther("100");
      await gbprToken.connect(addr1).burn(burnAmount);
      expect(await gbprToken.balanceOf(addr1.address)).to.equal(
        ethers.parseEther("900")
      );
    });
  });
});
