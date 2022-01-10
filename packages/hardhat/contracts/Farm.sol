pragma solidity 0.8.4;
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CrownToken.sol";
import "./Vault.sol";

contract Farm is Ownable {

  string public name = "Crown Capital Farm";
  
  address[] public stakers;
  address public crownAddress;

  uint256 public startTime;
  uint256 public totalStaked;
  uint256 public farmStartTime;
  uint256 public percentOfEmssions;  

  mapping(address => bool) public isStaking;
  mapping(address => uint256) public crownYield; // Yield to Claim
  mapping(address => uint256) public stakingBalance; // Amount User is Staking

  event Stake(address indexed from, uint256 amount);
  event Unstake(address indexed from, uint256 amount);
  event YieldWithdraw(address indexed to, uint256 amount);

  Vault vault;
  CrownToken crownToken;
  constructor(address tokenAddress, address vaultAddress) public {
    crownToken = CrownToken(tokenAddress);
    crownAddress=tokenAddress;
    vault = Vault(vaultAddress);
    percentOfEmssions=0;
    farmStartTime = block.timestamp;
    totalStaked=0;
  }

  //TODO: ADD switch for canStake, canWithdraw, 

  function stake(uint256 amountToStake) public {
    require(
      amountToStake > 0, 
      "You cannot stake zero tokens.");
    updateYield();  

    (bool sent) = crownToken.transferFrom(msg.sender, address(this), amountToStake);
    require(sent, "Failed to transfer tokens from user to Farm");
          
    if(stakingBalance[msg.sender] == 0){
        stakers.push(msg.sender);
    }            
    stakingBalance[msg.sender] += amountToStake;
    totalStaked+=amountToStake;
    isStaking[msg.sender] = true;
    startTime = block.timestamp;
    emit Stake(msg.sender, amountToStake);
  }

  function unstake(uint256 amountToUnstake) public {
    require(
      amountToUnstake > 0, 
      "You cannot unstake zero tokens.");    
    require(
      isStaking[msg.sender] = true &&
      stakingBalance[msg.sender] >= amountToUnstake, 
      "Requested withdraw greater than staking balance."
    );
    if(stakers.length > 0){
      updateYield();
    }

    uint256 balTransfer = 0;
    balTransfer = amountToUnstake;
    stakingBalance[msg.sender] -= balTransfer;
    totalStaked-= balTransfer;
    
    (bool sent) = crownToken.transfer(msg.sender, balTransfer);
    require(sent, "Failed to withdraw Tokens"); 

    if(stakingBalance[msg.sender] == 0){
      isStaking[msg.sender] = false;

      if(stakers.length == 1){
        delete stakers; }      
      else {
        for (
          uint256 stakersIndex = 0;
          stakersIndex < stakers.length;
          stakersIndex++
          ) {
              if(msg.sender == stakers[stakersIndex]){
                removeAddress(stakersIndex);
              }
            }
      }
    }

    emit Unstake(msg.sender, balTransfer);
  }

  // Withdraw Yield
  function withdrawYield() public {
      if (isStaking[msg.sender]){
        updateYield();
      }
      uint256 toTransfer=0;
      toTransfer = crownYield[msg.sender];
      crownYield[msg.sender] = 0;

      require(
        toTransfer > 0,
        "Nothing to withdraw"
        );

    uint256 farmBalance = crownToken.balanceOf(address(this));
    require(farmBalance >= toTransfer, 
           "Insuffcient funds in Farm Contract");          
    
    (bool sent) = crownToken.transfer(msg.sender, toTransfer);
    require(sent, "Failed to withdraw Tokens"); 
    
    emit YieldWithdraw(msg.sender, toTransfer);
  }

  function updateYield() private {
    vault.sendToFarm();
    for (
      uint256 stakersIndex = 0;
      stakersIndex < stakers.length;
      stakersIndex++
      ) {
          address staker = stakers[stakersIndex];
          uint256 totalYield = 0;
          totalYield = calculateUserTotalYield(staker);
          crownYield[staker] = totalYield;
        }
    startTime = block.timestamp;
  }

  function calculateUserTotalYield(address staker) public view returns(uint256) {
      uint256 secondsPassed = calculateYieldTime(staker) * 10**18;
      uint256 stakingPercent = userStakingPercent(staker);
      uint256 farmPercent = vault.getActiveFarmPercents(address(this));
      uint256 farmSecondsPerToken = vault.getFarmSecondsPerToken(address(this));
      uint256 newYield = (stakingPercent * secondsPassed) 
        / (farmSecondsPerToken);
      uint256 totalYield = crownYield[staker] + newYield;
      return totalYield;
  } 

  function userStakingPercent(address staker) public view returns(uint256) {    
    uint256 stakingPercent = 0;
    if(isStaking[staker] == true){
      stakingPercent = (stakingBalance[staker]*10**18) / totalStaked;
    }
    return stakingPercent;
  }


  function calculateYieldTime(address staker) public view returns(uint256){
      uint256 totalTime = 0;
      uint256 end = block.timestamp;
      totalTime = end - startTime;
      return totalTime;
  }

  // Move the last element value into the index to be deleted
  function removeAddress(uint index) private {
    stakers[index] = stakers[stakers.length - 1];
    stakers.pop(); // Remove the last element
  }  

  function getStakers() public view returns (address[] memory) {
      return stakers;
  }

  function isUserStaking(address staker) public view returns(bool) {
    return isStaking[staker];
  }

  function getUserBalance(address staker) public view returns(uint256) {
    return stakingBalance[staker];
  }

  function getCrownYield(address staker) public view returns(uint256) {
    return crownYield[staker];
  }

}
