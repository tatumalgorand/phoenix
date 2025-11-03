// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./UserAccount.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AccountFactory
 * @dev Factory contract for creating and managing user accounts
 * Allows the platform to create individual wallet contracts for each user
 */
contract AccountFactory is Ownable {
    // GBPR token contract address
    address public gbprToken;
    
    // Mapping of user address to their account contract
    mapping(address => address) public userAccounts;
    
    // Array of all created accounts
    address[] public allAccounts;
    
    // Fee for creating a new account (in wei)
    uint256 public accountCreationFee;
    
    // Events
    event AccountCreated(address indexed user, address indexed accountContract, uint256 timestamp);
    event AccountCreationFeeChanged(uint256 oldFee, uint256 newFee);
    event GBPRTokenChanged(address indexed oldToken, address indexed newToken);
    
    /**
     * @dev Constructor initializes the factory
     * @param _gbprToken GBPR token contract address
     * @param _accountCreationFee Initial fee for creating accounts
     */
    constructor(address _gbprToken, uint256 _accountCreationFee) Ownable(msg.sender) {
        require(_gbprToken != address(0), "GBPR token cannot be zero address");
        gbprToken = _gbprToken;
        accountCreationFee = _accountCreationFee;
    }
    
    /**
     * @dev Create a new user account contract
     * @param user Address of the user who will own the account
     * @return address Address of the newly created account contract
     */
    function createAccount(address user) external payable returns (address) {
        require(user != address(0), "User address cannot be zero");
        require(userAccounts[user] == address(0), "Account already exists for user");
        require(msg.value >= accountCreationFee, "Insufficient fee");
        
        // Create new UserAccount contract
        UserAccount newAccount = new UserAccount(user, owner(), gbprToken);
        address accountAddress = address(newAccount);
        
        // Record the account
        userAccounts[user] = accountAddress;
        allAccounts.push(accountAddress);
        
        emit AccountCreated(user, accountAddress, block.timestamp);
        
        // Refund excess payment
        if (msg.value > accountCreationFee) {
            payable(msg.sender).transfer(msg.value - accountCreationFee);
        }
        
        return accountAddress;
    }
    
    /**
     * @dev Create an account for the caller
     * @return address Address of the newly created account contract
     */
    function createMyAccount() external payable returns (address) {
        return this.createAccount{value: msg.value}(msg.sender);
    }
    
    /**
     * @dev Get the account contract address for a user
     * @param user User address
     * @return address Account contract address (zero if doesn't exist)
     */
    function getAccount(address user) external view returns (address) {
        return userAccounts[user];
    }
    
    /**
     * @dev Check if a user has an account
     * @param user User address
     * @return bool True if account exists
     */
    function hasAccount(address user) external view returns (bool) {
        return userAccounts[user] != address(0);
    }
    
    /**
     * @dev Get the total number of accounts created
     * @return uint256 Number of accounts
     */
    function getAccountCount() external view returns (uint256) {
        return allAccounts.length;
    }
    
    /**
     * @dev Get account address by index
     * @param index Account index
     * @return address Account contract address
     */
    function getAccountByIndex(uint256 index) external view returns (address) {
        require(index < allAccounts.length, "Index out of bounds");
        return allAccounts[index];
    }
    
    /**
     * @dev Set the account creation fee
     * @param newFee New fee amount in wei
     */
    function setAccountCreationFee(uint256 newFee) external onlyOwner {
        uint256 oldFee = accountCreationFee;
        accountCreationFee = newFee;
        emit AccountCreationFeeChanged(oldFee, newFee);
    }
    
    /**
     * @dev Update the GBPR token address
     * @param newGBPRToken New GBPR token contract address
     */
    function setGBPRToken(address newGBPRToken) external onlyOwner {
        require(newGBPRToken != address(0), "GBPR token cannot be zero address");
        address oldToken = gbprToken;
        gbprToken = newGBPRToken;
        emit GBPRTokenChanged(oldToken, newGBPRToken);
    }
    
    /**
     * @dev Withdraw collected fees
     * @param to Address to send fees to
     * @param amount Amount to withdraw
     */
    function withdrawFees(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0), "Recipient cannot be zero address");
        require(amount <= address(this).balance, "Insufficient balance");
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
    }
    
    /**
     * @dev Get the contract ETH balance
     * @return uint256 Balance in wei
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
