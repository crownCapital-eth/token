pragma solidity 0.8.12;
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// https://docs.openzeppelin.com/contracts/3.x/erc20

contract MockSushiLP is Ownable, ERC20 {
    constructor() ERC20("Mock Sushi LP", "SushiLP") {
        _mint(msg.sender, 100000000 * 10 ** 18);
    }
}
