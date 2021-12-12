pragma solidity 0.8.4;
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CrownToken.sol";

contract Vendor is Ownable {

  string public name = "Crown Capital Farm";

  address[] public stakers;
    
  mapping(address => bool) public isStaking;
  mapping(address => uint256) public startTime; //Unrealized time
  mapping(address => uint256) public crownYield; //pmknBalance
  mapping(address => uint256) public stakingBalance; //stakingBalance


  event Stake(address indexed from, uint256 amount);
  event Unstake(address indexed from, uint256 amount);
  event YieldWithdraw(address indexed to, uint256 amount);

  CrownToken crownToken;
  constructor(address tokenAddress) public {
    crownToken = CrownToken(tokenAddress);
  }

  
  uint256 public constant tokensPerEth = 100;
  event BuyTokens(address buyer, uint256 amountOfETH, uint256 amountOfTokens);
  event SellTokens(address seller, uint256 amountOfTokens, uint256 amountOfETH);



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
      require(sent, "Failed to transfer tokens from user to vendor");
            
      if(stakingBalance[msg.sender] == 0){
          stakers.push(msg.sender);
      }      
      
      stakingBalance[msg.sender] += amount;
      isStaking[msg.sender] = true;
      startTime[msg.sender] = block.timestamp;
      
      emit Stake(msg.sender, amount);
  }


    function unstake(uint256 amount) public {
        require(
            isStaking[msg.sender] = true &&
            stakingBalance[msg.sender] >= amount, 
            "Nothing to unstake"
        );
        updateYield();

        uint256 balTransfer = amount;
        amount = 0;
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


  function withdrawYield() public {
      updateYield();
      uint256 toTransfer = crownYield[msg.sender];

      require(
          toTransfer > 0 ||
          crownYield[msg.sender] > 0,
          "Nothing to withdraw"
          );
          
      if(crownYield[msg.sender] != 0){
          uint256 oldBalance = crownYield[msg.sender];
          crownYield[msg.sender] = 0;
          toTransfer += oldBalance;
      }

    uint256 vendorBalance = crownToken.balanceOf(address(this));
    require(vendorBalance >= toTransfer, 
           "Insuffcient funds in Vendor Contract");      
    
    startTime[msg.sender] = block.timestamp;

    (bool sent) = crownToken.transfer(msg.sender, toTransfer);
    require(sent, "Failed to withdraw Tokens"); 
    
    emit YieldWithdraw(msg.sender, toTransfer);
  } 











  // ToDo: create a payable buyTokens() function:
  function buyTokens() public payable returns (uint256 tokenAmount) {
    require(msg.value>0, "Must send Ether");
    uint256 amountToBuy = msg.value * tokensPerEth;

    uint256 vendorBalance = crownToken.balanceOf(address(this));
    require(vendorBalance >= amountToBuy, "Insuffcient funds in Vendor Contract");

    (bool sent) = crownToken.transfer(msg.sender, amountToBuy);
    require(sent, "Failed to send Tokens");  

    // emit the event
    emit BuyTokens(msg.sender, msg.value, amountToBuy);

    return amountToBuy;
  }

  // ToDo: create a withdraw() function that lets the owner withdraw ETH
  function withdraw() public onlyOwner {
    (bool sent, ) = msg.sender.call{value: address(this).balance}("");
    require(sent, "Failed to send Ether");

  }

  // ToDo: create a sellTokens() function:
  function sellTokens(uint256 theAmount) public returns (uint256 amountOfETHToTransfer) {
    require(theAmount>0, "Must send Tokens");

    uint256 userBalance = crownToken.balanceOf(msg.sender);
    require(userBalance >= theAmount, "You do not habe enough tokens");

    uint256 amountOfETHToTransfer = theAmount / tokensPerEth;
    uint256 ownerETHBalance = address(this).balance;
    require(ownerETHBalance >= amountOfETHToTransfer, "Vendor has not enough funds to accept the sell request");

    (bool sent) = crownToken.transferFrom(msg.sender, address(this), theAmount);
    require(sent, "Failed to transfer tokens from user to vendor");

    (sent, ) = msg.sender.call{value: amountOfETHToTransfer}("");
    require(sent, "Failed to send Ether");

    // emit the event
    emit SellTokens(msg.sender, theAmount, amountOfETHToTransfer);

    return amountOfETHToTransfer;
  }

}
