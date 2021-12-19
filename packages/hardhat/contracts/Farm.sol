pragma solidity 0.8.4;
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CrownToken.sol";
import "./Vault.sol";

contract Farm is Ownable {

  string public name = "Crown Capital Farm";

  address[] public stakers;
    
  mapping(address => bool) public isStaking;
  mapping(address => uint256) public startTime; // Unrealized time
  mapping(address => uint256) public crownYield; // Yield to Claim
  mapping(address => uint256) public stakingBalance; // Amount User is Staking


  event Stake(address indexed from, uint256 amount);
  event Unstake(address indexed from, uint256 amount);
  event YieldWithdraw(address indexed to, uint256 amount);

  CrownToken crownToken;
  Vault vault;
  constructor(address tokenAddress) public {
    crownToken = CrownToken(tokenAddress);
    vault = Vault(tokenAddress);
  }


  // Stake tokens to farm contract
  function stake(uint256 amount) public {
      require(
          amount > 0, 
          "You cannot stake zero tokens.");
      require(
          crownToken.balanceOf(msg.sender) >= amount, 
          "You cannot stake more tokens than you own.");          

      if(isStaking[msg.sender]){
        updateYield();
      }
       
      (bool sent) = crownToken.transferFrom(msg.sender, address(this), amount);
      require(sent, "Failed to transfer tokens from user to Farm");
            
      if(stakingBalance[msg.sender] == 0){
          stakers.push(msg.sender);
      }      
      
      stakingBalance[msg.sender] += amount;
      isStaking[msg.sender] = true;
      startTime[msg.sender] = block.timestamp;
      
      emit Stake(msg.sender, amount);
  }


  // Unstake tokens from farm contract
    function unstake(uint256 amount) public {

        require(
            isStaking[msg.sender] = true &&
            stakingBalance[msg.sender] >= amount, 
            "Nothing to unstake"
        );

        updateYield();

        uint256 balTransfer = 0;
        balTransfer = amount;
        stakingBalance[msg.sender] -= balTransfer;
        
        (bool sent) = crownToken.transfer(msg.sender, balTransfer);
        require(sent, "Failed to withdraw Tokens"); 

        if(stakingBalance[msg.sender] == 0){
            isStaking[msg.sender] = false;

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
        toTransfer > 0 ||
        crownYield[msg.sender] > 0,
        "Nothing to withdraw"
        );

    //vault.sendToFarm();

    uint256 farmBalance = crownToken.balanceOf(address(this));
    require(farmBalance >= toTransfer, 
           "Insuffcient funds in Farm Contract");      
    
    startTime[msg.sender] = block.timestamp;

    (bool sent) = crownToken.transfer(msg.sender, toTransfer);
    require(sent, "Failed to withdraw Tokens"); 
    
    emit YieldWithdraw(msg.sender, toTransfer);
  } 


  function updateYield() public {    
    uint256 totalStake = 0;
    totalStake = totalStaked();

    for (
        uint256 stakersIndex = 0;
        stakersIndex < stakers.length;
        stakersIndex++
        ) {
            address staker = stakers[stakersIndex];
            uint256 stakingPercent = stakingBalance[staker] / totalStake;

            uint256 rawYield = calculateYieldTotal(staker, totalStake);
            startTime[staker] = block.timestamp;
            crownYield[staker] += rawYield;          
          }
  }

  function totalStaked() public view returns(uint256) {    
    uint256 totalStake = 0;
    for (
        uint256 stakersIndex = 0;
        stakersIndex < stakers.length;
        stakersIndex++
        ) {
            address staker = stakers[stakersIndex];
            totalStake += stakingBalance[staker];
        }
        return totalStake;
  }

  function calculateYieldTotal(address staker, uint256 totalStake) private view returns(uint256) {
      uint256 secondsPassed = calculateYieldTime(staker) * 10**18;
      uint256 secondsPerToken = 30;//86400;
      uint256 tokens = secondsPassed / secondsPerToken;
      uint256 rawYield = (tokens * stakingBalance[staker] / totalStake);
      return rawYield;
  } 


  function calculateYieldTime(address user) private view returns(uint256){
      uint256 end = block.timestamp;
      uint256 totalTime = end - startTime[user];
      return totalTime;
  }

    function getArr() public view returns (address[] memory) {
        return stakers;
    }

  function removeAddress(uint index) private {
    // Move the last element into the place to delete
    stakers[index] = stakers[stakers.length - 1];
    // Remove the last element
    stakers.pop();
  }  

}
