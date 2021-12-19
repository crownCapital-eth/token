pragma solidity 0.8.4;
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// https://docs.openzeppelin.com/contracts/3.x/erc20

contract CrownToken is Ownable, ERC20 {

     constructor() public ERC20("Crown Capital Token", "CROWN") {
        _mint(msg.sender, 1000 * 10 ** 18);
    }
}
