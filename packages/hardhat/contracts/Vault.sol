pragma solidity 0.8.4;
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CrownToken.sol";

contract Vault is Ownable {

  string public name = "Crown Capital Vault";
  address public farmAddress = msg.sender;
  uint256 public lastEmissionsTime; // Unrealized time
  uint256 public emissions; // Tokens available for transfer
  //uint256 public secondsPassed=0;
  
  uint256 public tokensPerSecond= 475646879756468797; // Set the contract payout rate [s]
  uint256 public secondsPerToken=2102400000000000000; // Set the contract payout rate [s]
  //Actual rate: 75M/(5*365*24*3600) = 0.4756468797564688 Tokens per second
  uint256 public vaultStartTime;
  uint256 public secondsIn5Years=157680000;

  event EmissionsSent(address farmAddress, uint256 amount);
  event UpdateEmissions(uint256 emiss);

  CrownToken crownToken;
  constructor(address tokenAddress) public {
    crownToken = CrownToken(tokenAddress);
    vaultStartTime=block.timestamp;
    lastEmissionsTime=block.timestamp;
    emissions=0;
  }

  
  // Assign the address that the vault pays out to
  function assignFarm(address newFarmAddress) public onlyOwner {
      //sendToFarm();
      farmAddress = newFarmAddress;
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
    
    //startTime = block.timestamp;

    (bool sent) = crownToken.transfer(farmAddress, toTransfer);
    require(sent, "Failed to withdraw Tokens"); 
    
    emit EmissionsSent(farmAddress, toTransfer);
  } 


  function calculateEmissions() public {
      uint256 t0=0;
      t0=lastEmissionsTime;
      uint256 end = block.timestamp;
      lastEmissionsTime=end;      
      uint256 secondsPassed = (end - t0) * 10**18;   
      emissions += (secondsPassed * 10**18)/ secondsPerToken ;
      
      uint256 available = crownToken.balanceOf(address(this));

      if(emissions >  available){
        emissions=available;
      }    
    
    emit UpdateEmissions(emissions);
  }     

}
