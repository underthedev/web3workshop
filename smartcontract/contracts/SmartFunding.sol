// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SmartFunding {
    address public tokenAddress;
    uint public goal;
    uint public pool;
    uint public endTimeInDay;

    mapping(address => uint256) public investOf;
    mapping(address => uint256) public rewardOf;

    event Invest(address indexed from, uint256 amount);

    constructor(address _tokenAddress) {
        tokenAddress = _tokenAddress;
    }

    function innitialize(uint _goal, uint _endTimeInDay) external {
        goal = _goal;
        endTimeInDay = block.timestamp + (_endTimeInDay * 1 days);
    }

    function invest() external payable {
        require(msg.value > 0, "Reject amount of invest");
        require(investOf[msg.sender] == 0, "Already invest");

        uint256 totalSupply = IERC20(tokenAddress).totalSupply();
        uint256 rewardAmount = (totalSupply / goal) * msg.value;

        investOf[msg.sender] = msg.value;
        rewardOf[msg.sender] = rewardAmount;
        pool += msg.value;

        emit Invest(msg.sender, msg.value);
    }
}