// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IVerifiers.sol";

/// @title zkToken
contract zkToken {
    string public name = "zkToken";
    string public symbol = "ZKT";
    uint256 public decimals = 0;

    ITransferVerifier private transferVerifier;
    IRegistrationVerifier private registrationVerifier;
    IMintVerifier private mintVerifier;

    struct Key {
        uint256 g;
        uint256 n;
        uint256 powN2;
    }

    struct User {
        uint256 encryptedBalance;
        Key key;
    }

    mapping(address => User) private users;

    event Registration(address indexed _who);
    event Mint(address indexed _to);
    event Transfer(address indexed _to);

    error WrongProof(string _error);

    /* name, symbol, decimals */
    constructor(
        address _transferVerifierAddr,
        address _registrationVerifierAddr,
        address _mintVerifierAddr
    ) {
        transferVerifier = ITransferVerifier(_transferVerifierAddr);
        registrationVerifier = IRegistrationVerifier(_registrationVerifierAddr);
        mintVerifier = IMintVerifier(_mintVerifierAddr);
    }

    /// @notice Getting a user's balance
    /// @param _to user address
    /// @return encryptedBalance encrypted balance
    function balanceOf(address _to) external view returns (uint256) {
        return users[_to].encryptedBalance;
    }

    function getPubKey(address _to) external view returns (Key memory) {
        return users[_to].key;
    }

    function registration(
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint[4] calldata input
    ) external payable {
        require(input[0] >= 0, "wrong balance value");
        // input = balance, key.g, r, key.n
        require(input[1] >= 0 && input[3] >= 0, "invalid key value");
        require(users[msg.sender].encryptedBalance == 0, "you are registered");

        bool registrationProofIsCorrect = registrationVerifier.verifyProof(
            a,
            b,
            c,
            input
        );

        User storage user = users[msg.sender];

        if (registrationProofIsCorrect) {
            user.encryptedBalance = input[0];
            user.key.g = input[1];
            user.key.n = input[3];
            user.key.powN2 = input[3] * input[3];
            emit Registration(msg.sender);
        } else revert WrongProof("Wrong proof");
    }

    function mint(
        address _to,
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint[1] calldata input
    ) external onlyRegistered(_to) zeroAddress(_to) {
        bool mintProofIsCorrect = mintVerifier.verifyProof(a, b, c, input);

        User storage user = users[_to];

        if (mintProofIsCorrect) {
            unchecked {
                user.encryptedBalance =
                    (user.encryptedBalance * input[0]) %
                    user.key.powN2;
            }

            emit Mint(_to);
        } else revert WrongProof("Wrong proof");
    }

    function transfer(
        address _to,
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint[3] memory input
    ) external payable onlyRegistered(_to) zeroAddress(_to) {
        require(msg.sender != _to, "you cannot send tokens to yourself");

        User storage receiver = users[_to];
        User storage sender = users[msg.sender];

        input[0] = sender.encryptedBalance;

        bool transferProofIsCorrect = transferVerifier.verifyProof(
            a,
            b,
            c,
            input
        );

        if (transferProofIsCorrect) {
            unchecked {
                receiver.encryptedBalance =
                    (receiver.encryptedBalance * input[2]) %
                    receiver.key.powN2;

                sender.encryptedBalance =
                    (sender.encryptedBalance * input[1]) %
                    sender.key.powN2;
            }
            emit Transfer(_to);
        } else revert WrongProof("Wrong proof");
    }

    modifier onlyRegistered(address _to) {
        require(users[_to].encryptedBalance != 0, "user not registered");
        _;
    }

    modifier zeroAddress(address _to) {
        require(_to != address(0), "Zero address");
        _;
    }
}
