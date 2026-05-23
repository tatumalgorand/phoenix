// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GBPRToken
 * @dev GBPR (Great British Pound Reformed) stablecoin with 0.1% transfer fee
 * Based on USDC architecture but modified for GBP with integrated fee mechanism
 */
contract GBPRToken is ERC20, ERC20Burnable, Ownable {
    // Fee percentage in basis points (10 = 0.1%)
    uint256 public constant FEE_BASIS_POINTS = 10;
    uint256 public constant BASIS_POINTS_DIVISOR = 10000;
    
    // Address where fees are collected
    address public feeCollector;
    
    // Total fees collected
    uint256 public totalFeesCollected;
    
    // Minter role for authorized minting
    mapping(address => bool) public minters;
    
    // Blacklist for compliance
    mapping(address => bool) public blacklisted;
    
    // Events
    event FeeCollected(address indexed from, address indexed to, uint256 feeAmount);
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event FeeCollectorChanged(address indexed oldCollector, address indexed newCollector);
    event Blacklisted(address indexed account);
    event UnBlacklisted(address indexed account);
    
    /**
     * @dev Constructor initializes the GBPR token
     * @param _feeCollector Address where fees will be collected
     */
    constructor(address _feeCollector) ERC20("Great British Pound Reformed", "GBPR") Ownable(msg.sender) {
        require(_feeCollector != address(0), "Fee collector cannot be zero address");
        feeCollector = _feeCollector;
        minters[msg.sender] = true;
        emit MinterAdded(msg.sender);
    }
    
    /**
     * @dev Modifier to check if caller is a minter
     */
    modifier onlyMinter() {
        require(minters[msg.sender], "Caller is not a minter");
        _;
    }
    
    /**
     * @dev Modifier to check if address is not blacklisted
     */
    modifier notBlacklisted(address account) {
        require(!blacklisted[account], "Address is blacklisted");
        _;
    }
    
    /**
     * @dev Add a minter
     * @param account Address to grant minting privileges
     */
    function addMinter(address account) external onlyOwner {
        require(account != address(0), "Cannot add zero address as minter");
        require(!minters[account], "Address is already a minter");
        minters[account] = true;
        emit MinterAdded(account);
    }
    
    /**
     * @dev Remove a minter
     * @param account Address to revoke minting privileges
     */
    function removeMinter(address account) external onlyOwner {
        require(minters[account], "Address is not a minter");
        minters[account] = false;
        emit MinterRemoved(account);
    }
    
    /**
     * @dev Mint new GBPR tokens
     * @param to Address to receive minted tokens
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyMinter notBlacklisted(to) {
        require(to != address(0), "Cannot mint to zero address");
        _mint(to, amount);
    }
    
    /**
     * @dev Change the fee collector address
     * @param newFeeCollector New fee collector address
     */
    function setFeeCollector(address newFeeCollector) external onlyOwner {
        require(newFeeCollector != address(0), "Fee collector cannot be zero address");
        address oldCollector = feeCollector;
        feeCollector = newFeeCollector;
        emit FeeCollectorChanged(oldCollector, newFeeCollector);
    }
    
    /**
     * @dev Blacklist an address
     * @param account Address to blacklist
     */
    function blacklist(address account) external onlyOwner {
        require(account != address(0), "Cannot blacklist zero address");
        require(!blacklisted[account], "Address already blacklisted");
        blacklisted[account] = true;
        emit Blacklisted(account);
    }
    
    /**
     * @dev Remove address from blacklist
     * @param account Address to remove from blacklist
     */
    function unBlacklist(address account) external onlyOwner {
        require(blacklisted[account], "Address not blacklisted");
        blacklisted[account] = false;
        emit UnBlacklisted(account);
    }
    
    /**
     * @dev Calculate the fee for a transfer
     * @param amount Amount being transferred
     * @return fee The calculated fee (0.1% of amount)
     */
    function calculateFee(uint256 amount) public pure returns (uint256) {
        return (amount * FEE_BASIS_POINTS) / BASIS_POINTS_DIVISOR;
    }
    
    /**
     * @dev Override transfer to include 0.1% fee
     * @param to Recipient address
     * @param amount Amount to transfer (before fee)
     * @return bool Success status
     */
    function transfer(address to, uint256 amount) 
        public 
        virtual 
        override 
        notBlacklisted(msg.sender) 
        notBlacklisted(to) 
        returns (bool) 
    {
        address from = msg.sender;
        
        // Calculate fee
        uint256 fee = calculateFee(amount);
        uint256 amountAfterFee = amount - fee;
        
        // Transfer the amount minus fee to recipient
        _transfer(from, to, amountAfterFee);
        
        // Transfer fee to fee collector
        if (fee > 0) {
            _transfer(from, feeCollector, fee);
            totalFeesCollected += fee;
            emit FeeCollected(from, to, fee);
        }
        
        return true;
    }
    
    /**
     * @dev Override transferFrom to include 0.1% fee
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to transfer (before fee)
     * @return bool Success status
     */
    function transferFrom(address from, address to, uint256 amount) 
        public 
        virtual 
        override 
        notBlacklisted(from) 
        notBlacklisted(to) 
        returns (bool) 
    {
        address spender = msg.sender;
        _spendAllowance(from, spender, amount);
        
        // Calculate fee
        uint256 fee = calculateFee(amount);
        uint256 amountAfterFee = amount - fee;
        
        // Transfer the amount minus fee to recipient
        _transfer(from, to, amountAfterFee);
        
        // Transfer fee to fee collector
        if (fee > 0) {
            _transfer(from, feeCollector, fee);
            totalFeesCollected += fee;
            emit FeeCollected(from, to, fee);
        }
        
        return true;
    }
}
