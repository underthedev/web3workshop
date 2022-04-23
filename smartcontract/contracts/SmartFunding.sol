// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract SmartFunding is KeeperCompatibleInterface, Ownable, Pausable {
    uint256 public fundingStage; // 0 = INACTIVE, 1 = ACTIVE, 2 = SUCCESS, 3 = FAIL
    address public tokenAddress;
    uint public goal;
    uint public pool;
    uint public endTime;
    address upkeepAddress;

    mapping(address => uint256) public investOf;
    mapping(address => uint256) public rewardOf;
    mapping(address => bool) public claimedOf;

    event Invest(address indexed from, uint256 amount);
    event ClaimReward(address indexed from, uint256 amount);
    event Refund(address indexed from, uint256 amount);
    event StageChange(address indexed from, uint256 stage);

    constructor(address _tokenAddress, address _upkeepAddress) {
        tokenAddress = _tokenAddress;
        fundingStage = 0;
        upkeepAddress = _upkeepAddress;
    }

    function initialize(uint _goal, uint _endTimeInDay) external onlyOwner {
        goal = _goal;
        endTime = block.timestamp + (_endTimeInDay * 1 days);
        fundingStage = 1;
    }

    modifier atStage(uint stage) {
        require(fundingStage == stage);
        _;
    }

    function calculateReward(uint amount) public view returns (uint) {
        uint totalPool = pool + amount;
        uint256 totalSupply = IERC20(tokenAddress).totalSupply();
        if(totalPool <= goal)
        {
            return (totalSupply / goal) * amount;
        } else {
            return (totalSupply / goal) * (goal - pool);
        }
    }

    function invest() external payable atStage(1) whenNotPaused() {
        require(msg.value > 0, "Reject amount of invest");
        require(investOf[msg.sender] == 0, "Already invest");
        uint256 rewardAmount = calculateReward(msg.value);

        investOf[msg.sender] = msg.value;
        rewardOf[msg.sender] = rewardAmount;
        pool += msg.value;

        emit Invest(msg.sender, msg.value);
    }

    function claim() external atStage(2) whenNotPaused() {
        require(claimedOf[msg.sender] == false, "Already claimed");
        require(rewardOf[msg.sender] > 0, "No reward");
        uint256 reward = rewardOf[msg.sender];
        claimedOf[msg.sender] = true;
        rewardOf[msg.sender] = 0;
        IERC20(tokenAddress).transfer(msg.sender, reward);

        emit ClaimReward(msg.sender, reward);
    }

    function refund() external atStage(3) whenNotPaused() {
        require(investOf[msg.sender] > 0, "No invest");
        uint256 investAmount = investOf[msg.sender];
        investOf[msg.sender] = 0;
        rewardOf[msg.sender] = 0;
        pool -= investAmount;

        payable(msg.sender).transfer(investAmount);

        emit Refund(msg.sender, investAmount);
    }

    function checkUpkeep(bytes calldata /* checkData */) external view override returns (bool upkeepNeeded, bytes memory performData) {
        upkeepNeeded = fundingStage == 1 && block.timestamp >= endTime;
        performData = new bytes(0);
    }

    function performUpkeep(bytes calldata /* performData */) external override {
        require(msg.sender == upkeepAddress, "Permission denied");

        if (pool >= goal) {
            fundingStage = 2;
        } else {
            fundingStage = 3;
        }

        emit StageChange(msg.sender, fundingStage);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
}