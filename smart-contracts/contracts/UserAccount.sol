// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title UserAccount
 * @dev Individual user account contract for holding GBPR and other crypto assets
 * Each user gets their own instance of this contract
 */
contract UserAccount is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // System owner (the platform/project owner)
    address public systemOwner;
    
    // GBPR token contract address
    address public gbprToken;
    
    // Struct to track crypto deposits
    struct CryptoDeposit {
        address tokenAddress;
        uint256 amount;
        uint256 timestamp;
    }
    
    // Array of all crypto deposits
    CryptoDeposit[] public deposits;
    
    // Mapping of token address to total balance
    mapping(address => uint256) public tokenBalances;
    
    // Events
    event CryptoDeposited(address indexed token, uint256 amount, uint256 timestamp);
    event TokenWithdrawn(address indexed token, address indexed to, uint256 amount);
    event GBPRMinted(address indexed user, uint256 amount, uint256 fiatAmount);
    event SystemOwnerChanged(address indexed oldOwner, address indexed newOwner);
    
    /**
     * @dev Constructor initializes the user account
     * @param _accountOwner Owner of this account (the user)
     * @param _systemOwner System owner (platform owner)
     * @param _gbprToken GBPR token contract address
     */
    constructor(address _accountOwner, address _systemOwner, address _gbprToken) Ownable(_accountOwner) {
        require(_accountOwner != address(0), "Account owner cannot be zero address");
        require(_systemOwner != address(0), "System owner cannot be zero address");
        require(_gbprToken != address(0), "GBPR token cannot be zero address");
        
        systemOwner = _systemOwner;
        gbprToken = _gbprToken;
    }
    
    /**
     * @dev Modifier to restrict access to account owner or system owner
     */
    modifier onlyAuthorized() {
        require(msg.sender == owner() || msg.sender == systemOwner, "Not authorized");
        _;
    }
    
    /**
     * @dev Change the system owner
     * @param newSystemOwner New system owner address
     */
    function setSystemOwner(address newSystemOwner) external {
        require(msg.sender == systemOwner, "Only system owner can change");
        require(newSystemOwner != address(0), "System owner cannot be zero address");
        address oldOwner = systemOwner;
        systemOwner = newSystemOwner;
        emit SystemOwnerChanged(oldOwner, newSystemOwner);
    }
    
    /**
     * @dev Deposit cryptocurrency into the account
     * @param token ERC20 token contract address
     * @param amount Amount of tokens to deposit
     */
    function depositCrypto(address token, uint256 amount) external nonReentrant {
        require(token != address(0), "Token address cannot be zero");
        require(amount > 0, "Amount must be greater than zero");
        
        // Transfer tokens from sender to this contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Update balance
        tokenBalances[token] += amount;
        
        // Record deposit
        deposits.push(CryptoDeposit({
            tokenAddress: token,
            amount: amount,
            timestamp: block.timestamp
        }));
        
        emit CryptoDeposited(token, amount, block.timestamp);
    }
    
    /**
     * @dev Withdraw cryptocurrency from the account
     * Only account owner or system owner can withdraw
     * @param token ERC20 token contract address
     * @param to Address to send tokens to
     * @param amount Amount of tokens to withdraw
     */
    function withdrawToken(address token, address to, uint256 amount) external onlyAuthorized nonReentrant {
        require(token != address(0), "Token address cannot be zero");
        require(to != address(0), "Recipient cannot be zero address");
        require(amount > 0, "Amount must be greater than zero");
        require(tokenBalances[token] >= amount, "Insufficient balance");
        
        // Update balance
        tokenBalances[token] -= amount;
        
        // Transfer tokens
        IERC20(token).safeTransfer(to, amount);
        
        emit TokenWithdrawn(token, to, amount);
    }
    
    /**
     * @dev Withdraw ETH from the account
     * Only account owner or system owner can withdraw
     * @param to Address to send ETH to
     * @param amount Amount of ETH to withdraw
     */
    function withdrawETH(address payable to, uint256 amount) external onlyAuthorized nonReentrant {
        require(to != address(0), "Recipient cannot be zero address");
        require(amount > 0, "Amount must be greater than zero");
        require(address(this).balance >= amount, "Insufficient ETH balance");
        
        (bool success, ) = to.call{value: amount}("");
        require(success, "ETH transfer failed");
    }
    
    /**
     * @dev Get the balance of a specific token in this account
     * @param token Token contract address
     * @return uint256 Token balance
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return tokenBalances[token];
    }
    
    /**
     * @dev Get the ETH balance of this account
     * @return uint256 ETH balance
     */
    function getETHBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Get the number of deposits made to this account
     * @return uint256 Number of deposits
     */
    function getDepositCount() external view returns (uint256) {
        return deposits.length;
    }
    
    /**
     * @dev Get deposit details by index
     * @param index Deposit index
     * @return tokenAddress Token contract address
     * @return amount Deposit amount
     * @return timestamp Deposit timestamp
     */
    function getDeposit(uint256 index) external view returns (address tokenAddress, uint256 amount, uint256 timestamp) {
        require(index < deposits.length, "Index out of bounds");
        CryptoDeposit memory deposit = deposits[index];
        return (deposit.tokenAddress, deposit.amount, deposit.timestamp);
    }
    
    /**
     * @dev Receive function to accept ETH deposits
     */
    receive() external payable {
        emit CryptoDeposited(address(0), msg.value, block.timestamp);
    }
    
    /**
     * @dev Fallback function
     */
    fallback() external payable {
        emit CryptoDeposited(address(0), msg.value, block.timestamp);
    }
}
