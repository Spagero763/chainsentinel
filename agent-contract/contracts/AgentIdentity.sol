// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title AgentIdentity
 * @notice ERC-8004 compliant on-chain identity registry for autonomous AI agents.
 *         Each agent is issued a unique NFT that records its skills, reputation,
 *         and performance history immutably on Mantle.
 */
contract AgentIdentity {
    // ─── Events ────────────────────────────────────────────────────────────────

    event AgentRegistered(uint256 indexed tokenId, address indexed owner, string name);
    event SkillAdded(uint256 indexed tokenId, string skill);
    event SkillExecuted(uint256 indexed tokenId, string skill, bool success, uint256 timestamp);
    event ReputationUpdated(uint256 indexed tokenId, int256 delta, int256 newScore);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    // ─── Errors ────────────────────────────────────────────────────────────────

    error NotOwner();
    error NotOperator();
    error TokenNotFound();
    error SkillNotRegistered();
    error AlreadyRegistered();
    error ZeroAddress();

    // ─── Types ─────────────────────────────────────────────────────────────────

    struct Agent {
        string  name;
        string  agentType;       // "trading", "analytics", "devtools", "wallet"
        address owner;
        uint256 mintedAt;
        uint256 totalExecutions;
        uint256 successfulExecutions;
        int256  reputationScore;
        bool    active;
    }

    struct SkillExecution {
        string  skill;
        bool    success;
        uint256 timestamp;
        bytes32 dataHash;        // hash of execution input/output for audit
    }

    // ─── Storage ───────────────────────────────────────────────────────────────

    uint256 public totalSupply;

    mapping(uint256 => Agent)              public agents;
    mapping(uint256 => string[])           public agentSkills;
    mapping(uint256 => mapping(string => bool)) public hasSkill;
    mapping(uint256 => SkillExecution[])   public executionLog;
    mapping(address => uint256[])          public ownerTokens;
    mapping(uint256 => address)            public getApproved;
    mapping(address => mapping(address => bool)) public isApprovedForAll;

    // operators allowed to record executions on behalf of agent owners
    mapping(address => bool)               public operators;
    address public immutable deployer;

    // ─── Constructor ───────────────────────────────────────────────────────────

    constructor() {
        deployer = msg.sender;
        operators[msg.sender] = true;
    }

    // ─── Modifiers ─────────────────────────────────────────────────────────────

    modifier onlyDeployer() {
        if (msg.sender != deployer) revert NotOwner();
        _;
    }

    modifier onlyTokenOwner(uint256 tokenId) {
        if (agents[tokenId].owner != msg.sender) revert NotOwner();
        _;
    }

    modifier onlyOperatorOrOwner(uint256 tokenId) {
        if (!operators[msg.sender] && agents[tokenId].owner != msg.sender) revert NotOperator();
        _;
    }

    modifier tokenExists(uint256 tokenId) {
        if (agents[tokenId].owner == address(0)) revert TokenNotFound();
        _;
    }

    // ─── Registration ──────────────────────────────────────────────────────────

    function registerAgent(
        string calldata agentName,
        string calldata agentType,
        string[] calldata skills
    ) external returns (uint256 tokenId) {
        tokenId = ++totalSupply;

        agents[tokenId] = Agent({
            name:                 agentName,
            agentType:            agentType,
            owner:                msg.sender,
            mintedAt:             block.timestamp,
            totalExecutions:      0,
            successfulExecutions: 0,
            reputationScore:      0,
            active:               true
        });

        for (uint256 i = 0; i < skills.length; ++i) {
            _addSkill(tokenId, skills[i]);
        }

        ownerTokens[msg.sender].push(tokenId);

        emit AgentRegistered(tokenId, msg.sender, agentName);
        emit Transfer(address(0), msg.sender, tokenId);
    }

    // ─── Skills ────────────────────────────────────────────────────────────────

    function addSkill(uint256 tokenId, string calldata skill)
        external
        tokenExists(tokenId)
        onlyTokenOwner(tokenId)
    {
        _addSkill(tokenId, skill);
    }

    function _addSkill(uint256 tokenId, string memory skill) internal {
        if (!hasSkill[tokenId][skill]) {
            hasSkill[tokenId][skill] = true;
            agentSkills[tokenId].push(skill);
            emit SkillAdded(tokenId, skill);
        }
    }

    function getSkills(uint256 tokenId) external view returns (string[] memory) {
        return agentSkills[tokenId];
    }

    // ─── Execution Recording ───────────────────────────────────────────────────

    function recordExecution(
        uint256 tokenId,
        string calldata skill,
        bool success,
        bytes32 dataHash
    ) external tokenExists(tokenId) onlyOperatorOrOwner(tokenId) {
        if (!hasSkill[tokenId][skill]) revert SkillNotRegistered();

        Agent storage agent = agents[tokenId];
        agent.totalExecutions++;
        if (success) agent.successfulExecutions++;

        executionLog[tokenId].push(SkillExecution({
            skill:     skill,
            success:   success,
            timestamp: block.timestamp,
            dataHash:  dataHash
        }));

        // reputation: +2 for success, -3 for failure
        int256 delta = success ? int256(2) : int256(-3);
        agent.reputationScore += delta;

        emit SkillExecuted(tokenId, skill, success, block.timestamp);
        emit ReputationUpdated(tokenId, delta, agent.reputationScore);
    }

    function getExecutionLog(uint256 tokenId)
        external
        view
        returns (SkillExecution[] memory)
    {
        return executionLog[tokenId];
    }

    function successRate(uint256 tokenId)
        external
        view
        tokenExists(tokenId)
        returns (uint256)
    {
        Agent storage agent = agents[tokenId];
        if (agent.totalExecutions == 0) return 0;
        return (agent.successfulExecutions * 100) / agent.totalExecutions;
    }

    // ─── Operator Management ───────────────────────────────────────────────────

    function setOperator(address op, bool approved) external onlyDeployer {
        operators[op] = approved;
    }

    // ─── ERC-721 Minimal Surface ───────────────────────────────────────────────

    function ownerOf(uint256 tokenId) external view tokenExists(tokenId) returns (address) {
        return agents[tokenId].owner;
    }

    function balanceOf(address owner) external view returns (uint256) {
        if (owner == address(0)) revert ZeroAddress();
        return ownerTokens[owner].length;
    }

    function tokenOf(address owner) external view returns (uint256[] memory) {
        return ownerTokens[owner];
    }

    function name() external pure returns (string memory) { return "ChainSentinel Agent Identity"; }
    function symbol() external pure returns (string memory) { return "CSAI"; }
}
