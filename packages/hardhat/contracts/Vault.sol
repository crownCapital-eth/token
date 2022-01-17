pragma solidity 0.8.4;
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./CrownToken.sol";

/// @title Crown Capital Vault
/// @author sters.eth
/// @notice Contract sends token emissions to farms over a 5 year period
contract Vault is Ownable, Pausable {
  
  string public name = "Crown Capital Vault";

  /// @dev Array of initialized tokens to set as farm
  address[] public farmTokens;
  
  /// @dev Array of initialized percents to set with intialized tokens
  uint256[] public farmPercents;
  
  /// @dev Array of active farms
  address[] public activeFarmTokens;
  
  /// @dev token contract to yield % of emissions from vault
  mapping(address => uint256) public activeFarmPercents;

  /// @dev last time emissions were updated
  uint256 public lastEmissionsTime; 

  /// @dev Tokens available for transfer from the farm
  uint256 public emissions; 

  /// @dev The Vault emissions rate in seconds 
  uint256 public tokensPerSecond= 475646879756468797; 
  uint256 public secondsPerToken=2102400000000000000;
  
  /// @dev the time the vault was deployed
  uint256 public vaultStartTime;

  /// @dev the seconds in five years
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

  /** @dev Owner may intialize a new farm or set of farms 1 at a time.
    * @param tokenAddress address of farm.
    * @param percent 0 to 100 percent of the emssions which do to specified farm.
    */  
  function initializeFarm(address tokenAddress, uint256 percent) public onlyOwner {
    require(
      percent>=0 && percent<=100,
      "Percent must be between 0 and 100"
    );
    farmTokens.push(tokenAddress);
    farmPercents.push(percent);    
  }

  /// @dev Owner reset any initalized farm is a mistake is made or when the active farms are set.
  function resetInitialization() public onlyOwner {
    delete farmTokens;
    delete farmPercents;
  }

  /** @dev used to set the active farms following intialization
   */
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

  /// @dev Owner may calculate the the total percent from all initialized farms
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

  /** @dev Kill switch to remove all active farms.
    Cannot delete mapping. Set ther old farm percents 
    to zero then delete the activeFarm array
  */
  function killActiveFarms() public onlyOwner {
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

  /// @dev sends all emissions to farms based on percentage of total emissions
  function sendToFarm() public whenNotPaused {    
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

  /// @dev Calculates the total emissions
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

  /// @return array of initialized farm addresses
  function getFarmTokens() public view returns (address[] memory) {
    return farmTokens;
  }

  /// @return array of initialized farm percentages
  function getFarmPercents() public view returns (uint256[] memory) {
    return farmPercents;
  }

  /// @return array of active farm tokens
  function getActiveFarmTokens() public view returns (address[] memory) {
    return activeFarmTokens;
  }

  /** @dev returns the percentange of current emissions an address recieves
  * @param farmAddr farm address to query
  * @return the percentage of current emmissions going to farmAddr
  */
  function getActiveFarmPercents(address farmAddr) public view returns(uint256) {        
    uint256 percent = 0;
    if(isFarmActive(farmAddr)){
      percent = activeFarmPercents[farmAddr];
    }      
    return percent;
  }

  /** @dev calculates the seconds per token to a specific farm based on percentage of total
  * This is used by the farm to determine each user's yield.
  * @param farmAddr farm address to query
  * @return seconds per token the farm is currently generating
  */
  function getFarmSecondsPerToken(address farmAddr) public view returns(uint256) {
    uint256 farmSecondsPerToken = 0;
    if(isFarmActive(farmAddr)){
        uint256 farmPercent = getActiveFarmPercents(farmAddr);
         farmSecondsPerToken = (secondsPerToken*100)/farmPercent;
    }
    return farmSecondsPerToken;
  }

  /** @dev calculates the emissions to a farm based on the perctage of 
  * emssions.
  * @param farmAddr farm address to query
  * @return perFarmEmission the Emissions going to farmAddr
  */
  function calculatePerFarmEmissions(address farmAddr) public view returns(uint256) {        
    uint256 farmPercent = activeFarmPercents[farmAddr];
    uint256 perFarmEmission= (emissions * farmPercent)/100;
    
    return perFarmEmission;
  }

  /** @dev iterates over active farms to determine is passed address is in the array
  * @param farmAddr farm address to query
  * @return isActive - true if passed address is an active farm else false.
  */
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
