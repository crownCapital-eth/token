pragma solidity 0.8.4;
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CrownToken.sol";

contract Vault is Ownable {

  string public name = "Crown Capital Vault";

  address[] public farmTokens;
  uint256[] public farmPercents;
  address[] public activeFarmTokens;
  
  // token contract to yield % of emissions from vault
  mapping(address => uint256) public activeFarmPercents;

  uint256 public lastEmissionsTime; // Unrealized time
  uint256 public emissions; // Tokens available for transfer
  // Set the Vault emissions rate [s]
  uint256 public tokensPerSecond= 475646879756468797; 
  uint256 public secondsPerToken=2102400000000000000;
  
  uint256 public vaultStartTime;
  uint256 public secondsIn5Years=157680000;

  event EmissionsSent(address farmAddress, uint256 amount);
  event UpdateEmissions(uint256 emiss);

  CrownToken crownToken;
  constructor(address tokenAddress) {
    crownToken = CrownToken(tokenAddress);
    vaultStartTime=block.timestamp;
    lastEmissionsTime=block.timestamp;
    emissions=0;
  }
  
  function initializeFarm(address tokenAddress, uint256 percent) public onlyOwner {
    require(
      percent>=0 && percent<=100,
      "Percent must be between 0 and 100"
    );
    farmTokens.push(tokenAddress);
    farmPercents.push(percent);    
  }


  function resetInitialization() public onlyOwner {
    delete farmTokens;
    delete farmPercents;
  }


  function setFarms() public onlyOwner{   
    require(
      farmTokens.length >= 1,
      "To set farm at least 1 farm must be initialized"
    );

    require(
      farmTokens.length == farmPercents.length,
      "Addresses and percents must be of equal length"
    );
    uint256 totalPercent=0;
    totalPercent=calculateTotalPercent();
    require(totalPercent==100, "Total Percent must be 100");
    killActiveFarms();
    // SET NEW FARMS
    for (
      uint256 idx = 0;
      idx < farmTokens.length;
      idx++
      ) {        
        address addr = farmTokens[idx];
        activeFarmPercents[addr]=farmPercents[idx];
        activeFarmTokens.push(addr);
        }    
    resetInitialization();
  }


  function calculateTotalPercent() public view onlyOwner returns (uint256){
    uint256 totalPercent = 0;
    for (
      uint256 idx = 0;
      idx < farmPercents.length;
      idx++
      ) {        
        totalPercent+=farmPercents[idx];
        }
    return totalPercent;
  }


  function killActiveFarms() public onlyOwner {
    // Cannot delete mapping. Set ther old farm percents 
    //  to zero then delete the activeFarm array
    for (
      uint256 idx = 0;
      idx < activeFarmTokens.length;
      idx++
      ) {        
        address addr = activeFarmTokens[idx];
        activeFarmPercents[addr]=0;
        }    
    delete activeFarmTokens;
  }

  function sendToFarm() public {    
    calculateEmissions();
    require(
      emissions > 0 ,
      "Nothing to withdraw"
      );

    uint256 vaultBalance = 0;
    vaultBalance = crownToken.balanceOf(address(this));
    require(vaultBalance >= emissions,
          "Insuffcient funds in Vault Contract");        
    
    uint256 amountToFarms = 0;
    amountToFarms = emissions;
    
    for (
      uint256 idx = 0;
      idx < activeFarmTokens.length;
      idx++
      ) { 
        uint256 toTransfer = 0;
        address farmAddr = activeFarmTokens[idx];
        
        toTransfer =calculatePerFarmEmissions(farmAddr);
        amountToFarms-=toTransfer;
        (bool sent) = crownToken.transfer(farmAddr, toTransfer);
        require(sent, "Failed to withdraw Tokens");
        
        emit EmissionsSent(farmAddr, toTransfer);
      }
    emissions=0;

  } 

  function calculateEmissions() public {
    uint256 t0=0;
    t0=lastEmissionsTime;
    uint256 end = block.timestamp;
    lastEmissionsTime=end;      
    uint256 secondsPassed = (end - t0) * 10**18;   
    emissions += (secondsPassed * 10**18)/ secondsPerToken;
    
    uint256 available = 0;
    available = crownToken.balanceOf(address(this));
    if(emissions >  available){
      emissions=available;
    }
    emit UpdateEmissions(emissions);
  }     

  function getFarmTokens() public view returns (address[] memory) {
    return farmTokens;
  }

  function getFarmPercents() public view returns (uint256[] memory) {
    return farmPercents;
  }

  function getActiveFarmTokens() public view returns (address[] memory) {
    return activeFarmTokens;
  }

  function getActiveFarmPercents(address farmAddr) public view returns(uint256) {        
    uint256 percent = 0;
    if(isFarmActive(farmAddr)){
      percent = activeFarmPercents[farmAddr];
    }      
    return percent;
  }

  function getFarmSecondsPerToken(address farmAddr) public view returns(uint256) {
    uint256 farmSecondsPerToken = 0;
    if(isFarmActive(farmAddr)){
        uint256 farmPercent = getActiveFarmPercents(farmAddr);
         farmSecondsPerToken = (secondsPerToken*100)/farmPercent;
    }
    return farmSecondsPerToken;
  }

  function calculatePerFarmEmissions(address farmAddr) public view returns(uint256) {        
    uint256 farmPercent = activeFarmPercents[farmAddr];
    uint256 perFarmEmission= (emissions * farmPercent)/100;
    
    return perFarmEmission;
  }

  function isFarmActive(address farmAddr) public view returns(bool) {
    address addr;
    bool isActive = false;

    for (
      uint256 idx = 0; 
      idx < activeFarmTokens.length; 
      idx++
      ) {
        addr = activeFarmTokens[idx];
        if(addr == farmAddr){isActive=true;}
      }
    return isActive;
  }

}
