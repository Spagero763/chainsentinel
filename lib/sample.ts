export const SAMPLE_CONTRACT = `// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

// Deliberately vulnerable staking contract — demo for ChainSentinel
// Triggers ~15 of the analyzer's gas + security rules
contract VulnerableStaking {

    address public owner;
    uint256 public totalStaked;
    bool public paused;
    uint256 public minStake;

    mapping(address => uint256) public stakes;
    address[] public stakers;

    event Staked(address user, uint256 amount);
    event Withdrawn(address user, uint256 amount);

    constructor(uint256 _minStake) public {
        owner = tx.origin;
        minStake = _minStake;
    }

    function stake() public payable {
        require(!paused, "the staking contract is currently paused for maintenance");
        require(msg.value >= minStake, "below min");

        stakes[msg.sender] += msg.value;
        totalStaked += msg.value;
        stakers.push(msg.sender);

        emit Staked(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) public {
        require(stakes[msg.sender] >= amount, "insufficient balance for withdrawal request submitted");

        (bool success, ) = msg.sender.call{value: amount}("");

        stakes[msg.sender] -= amount;
        totalStaked -= amount;

        emit Withdrawn(msg.sender, amount);
    }

    function emergencyWithdraw() public {
        msg.sender.transfer(address(this).balance);
    }

    function distributeRewards() public {
        for (uint256 i = 0; i < stakers.length; i++) {
            uint256 reward = stakes[stakers[i]] * 10 ** 18 / totalStaked;
            (bool ok, ) = stakers[i].call{value: reward}("");
        }
    }

    function pickLotteryWinner() public view returns (address) {
        uint256 idx = uint256(blockhash(block.number - 1)) % stakers.length;
        return stakers[idx];
    }

    function setOwner(address newOwner) public {
        owner = newOwner;
    }

    function setMinStake(uint256 newMin) public {
        minStake = newMin;
    }

    function pause() public {
        paused = true;
    }

    function approveSpender(address spender) public {
        IERC20(0xdeAD000000000000000000000000000000000000).approve(spender, 2**256 - 1);
    }
}

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
}
`
