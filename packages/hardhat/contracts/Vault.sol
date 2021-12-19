pragma solidity 0.8.4;
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CrownToken.sol";

contract Vault is Ownable {

  string public name = "Crown Capital Vault";
  address public farmAddress = msg.sender;

  uint256 public startTime; //Unrealized time
  uint256 public emissions; //Tokens available for transfer
  uint256 public rate; // Set the contract payout rate [s]

  event YieldWithdraw(address farmAddress, uint256 amount);

  CrownToken crownToken;
  constructor(address tokenAddress) public {
    crownToken = CrownToken(tokenAddress);
    startTime=block.timestamp;
    rate=10;
    emissions=0;
  }

  
  // Assign the address that the vault pays out to
  function assignFarm(address newFarmAddress) public onlyOwner {
      farmAddress = newFarmAddress;
      //console.log(msg.sender,"set farm address to", farmAddress);
  }


  function sendToFarm() public {
    uint256 toTransfer = 0;
    calculateEmissions();
    toTransfer = emissions;
    emissions=0;

    require(
        toTransfer > 0 ,
        "Nothing to withdraw"
        );
        

    uint256 vaultBalance = crownToken.balanceOf(address(this));
    require(vaultBalance >= toTransfer, 
           "Insuffcient funds in Vault Contract");      
    
    startTime = block.timestamp;

    (bool sent) = crownToken.transfer(farmAddress, toTransfer);
    require(sent, "Failed to withdraw Tokens"); 
    
    emit YieldWithdraw(farmAddress, toTransfer);
  } 


  function calculateEmissions() public {
      uint256 end = block.timestamp;
      uint256 secondsPassed = (end - startTime) * 10**18;
      uint256 secondsPerToken = rate;
      emissions += secondsPassed / secondsPerToken;
      startTime=end;
  }     


  function sendTokens(uint256 amountToSend) public  {

    uint256 vaultBalance = crownToken.balanceOf(address(this));
    require(vaultBalance >= amountToSend, "Insuffcient funds in Vendor Contract");

    (bool sent) = crownToken.transfer(msg.sender, amountToSend);
    require(sent, "Failed to send Tokens");     
  }
}
