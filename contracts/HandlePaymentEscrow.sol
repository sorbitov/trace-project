// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
}

contract HandlePaymentEscrow {
    enum Status {
        Pending,
        Claimed,
        Refunded,
        Cancelled
    }

    struct Payment {
        address sender;
        bytes32 identityHash;
        uint256 amount;
        uint64 expiresAt;
        bool cancellable;
        Status status;
    }

    IERC20 public immutable usdc;
    address public verifier;
    address public owner;
    uint256 public nextPaymentId;
    bool public paused;

    mapping(uint256 => Payment) public payments;
    mapping(bytes32 => bool) public usedClaimDigests;

    event PaymentCreated(
        uint256 indexed paymentId,
        address indexed sender,
        bytes32 indexed identityHash,
        uint256 amount,
        uint64 expiresAt,
        bool cancellable
    );
    event PaymentClaimed(uint256 indexed paymentId, address indexed recipient);
    event PaymentRefunded(uint256 indexed paymentId);
    event PaymentCancelled(uint256 indexed paymentId);
    event VerifierUpdated(address indexed verifier);
    event Paused(bool paused);

    error Unauthorized();
    error PausedState();
    error InvalidPayment();
    error InvalidStatus();
    error NotExpired();
    error Expired();
    error BadSignature();

    constructor(address usdc_, address verifier_) {
        usdc = IERC20(usdc_);
        verifier = verifier_;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier notPaused() {
        if (paused) revert PausedState();
        _;
    }

    function createPayment(
        bytes32 identityHash,
        uint256 amount,
        uint64 expiresAt,
        bool cancellable
    ) external notPaused returns (uint256 paymentId) {
        if (identityHash == bytes32(0) || amount == 0 || expiresAt <= block.timestamp) {
            revert InvalidPayment();
        }

        paymentId = ++nextPaymentId;
        payments[paymentId] = Payment({
            sender: msg.sender,
            identityHash: identityHash,
            amount: amount,
            expiresAt: expiresAt,
            cancellable: cancellable,
            status: Status.Pending
        });

        require(usdc.transferFrom(msg.sender, address(this), amount), "USDC_TRANSFER_FROM_FAILED");
        emit PaymentCreated(paymentId, msg.sender, identityHash, amount, expiresAt, cancellable);
    }

    function claim(
        uint256 paymentId,
        address recipient,
        uint64 authorizationExpiresAt,
        bytes calldata signature
    ) external notPaused {
        Payment storage payment = payments[paymentId];
        if (payment.sender == address(0)) revert InvalidPayment();
        if (payment.status != Status.Pending) revert InvalidStatus();
        if (block.timestamp > payment.expiresAt) revert Expired();
        if (block.timestamp > authorizationExpiresAt) revert Expired();

        bytes32 digest = claimDigest(paymentId, recipient, authorizationExpiresAt);
        if (usedClaimDigests[digest]) revert BadSignature();
        if (_recoverEthSigned(digest, signature) != verifier) revert BadSignature();

        usedClaimDigests[digest] = true;
        payment.status = Status.Claimed;
        require(usdc.transfer(recipient, payment.amount), "USDC_TRANSFER_FAILED");
        emit PaymentClaimed(paymentId, recipient);
    }

    function refundExpired(uint256 paymentId) external notPaused {
        Payment storage payment = payments[paymentId];
        if (payment.sender == address(0)) revert InvalidPayment();
        if (msg.sender != payment.sender) revert Unauthorized();
        if (payment.status != Status.Pending) revert InvalidStatus();
        if (block.timestamp <= payment.expiresAt) revert NotExpired();

        payment.status = Status.Refunded;
        require(usdc.transfer(payment.sender, payment.amount), "USDC_TRANSFER_FAILED");
        emit PaymentRefunded(paymentId);
    }

    function cancel(uint256 paymentId) external notPaused {
        Payment storage payment = payments[paymentId];
        if (payment.sender == address(0)) revert InvalidPayment();
        if (msg.sender != payment.sender) revert Unauthorized();
        if (payment.status != Status.Pending) revert InvalidStatus();
        if (!payment.cancellable) revert Unauthorized();

        payment.status = Status.Cancelled;
        require(usdc.transfer(payment.sender, payment.amount), "USDC_TRANSFER_FAILED");
        emit PaymentCancelled(paymentId);
    }

    function setVerifier(address verifier_) external onlyOwner {
        verifier = verifier_;
        emit VerifierUpdated(verifier_);
    }

    function setPaused(bool paused_) external onlyOwner {
        paused = paused_;
        emit Paused(paused_);
    }

    function claimDigest(
        uint256 paymentId,
        address recipient,
        uint64 authorizationExpiresAt
    ) public view returns (bytes32) {
        return keccak256(
            abi.encode(
                "HANDLEPAY_CLAIM",
                block.chainid,
                address(this),
                paymentId,
                recipient,
                authorizationExpiresAt
            )
        );
    }

    function _recoverEthSigned(bytes32 digest, bytes calldata signature) internal pure returns (address) {
        if (signature.length != 65) revert BadSignature();
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (v < 27) v += 27;
        bytes32 ethDigest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));
        return ecrecover(ethDigest, v, r, s);
    }
}
