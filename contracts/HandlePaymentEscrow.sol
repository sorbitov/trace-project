// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
}

library SafeToken {
    error TokenCallFailed();

    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        (bool ok, bytes memory result) = address(token).call(
            abi.encodeCall(IERC20.transfer, (to, value))
        );
        if (!ok || (result.length != 0 && !abi.decode(result, (bool)))) revert TokenCallFailed();
    }

    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        (bool ok, bytes memory result) = address(token).call(
            abi.encodeCall(IERC20.transferFrom, (from, to, value))
        );
        if (!ok || (result.length != 0 && !abi.decode(result, (bool)))) revert TokenCallFailed();
    }
}

contract HandlePaymentEscrow {
    using SafeToken for IERC20;

    enum Status { Pending, Claimed, Refunded, Cancelled }

    struct Payment {
        address sender;
        bytes32 identityHash;
        uint256 amount;
        uint64 expiresAt;
        bool cancellable;
        Status status;
    }

    uint256 private constant SECP256K1_HALF_N =
        0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0;
    uint16 public constant MAX_FEE_BPS = 1_000;

    IERC20 public immutable usdc;
    address public verifier;
    address public treasury;
    address public owner;
    address public pendingOwner;
    uint16 public minimumFeeBps;
    uint256 public nextPaymentId;
    bool public paused;
    uint256 private locked = 1;

    mapping(uint256 => Payment) public payments;
    mapping(bytes32 => bool) public usedClaimDigests;

    event PaymentCreated(
        uint256 indexed paymentId,
        address indexed sender,
        bytes32 indexed identityHash,
        uint256 amount,
        uint256 fee,
        uint64 expiresAt,
        bool cancellable
    );
    event PaymentClaimed(uint256 indexed paymentId, address indexed recipient);
    event PaymentRefunded(uint256 indexed paymentId);
    event PaymentCancelled(uint256 indexed paymentId);
    event VerifierUpdated(address indexed verifier);
    event TreasuryUpdated(address indexed treasury);
    event MinimumFeeUpdated(uint16 feeBps);
    event OwnershipTransferStarted(address indexed currentOwner, address indexed pendingOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(bool paused);

    error Unauthorized();
    error PausedState();
    error InvalidAddress();
    error InvalidPayment();
    error InvalidStatus();
    error InvalidFee();
    error NotExpired();
    error Expired();
    error BadSignature();
    error Reentrancy();

    constructor(
        address usdc_,
        address verifier_,
        address treasury_,
        address owner_,
        uint16 minimumFeeBps_
    ) {
        if (usdc_ == address(0) || verifier_ == address(0) || treasury_ == address(0) || owner_ == address(0)) {
            revert InvalidAddress();
        }
        if (minimumFeeBps_ > MAX_FEE_BPS) revert InvalidFee();
        usdc = IERC20(usdc_);
        verifier = verifier_;
        treasury = treasury_;
        owner = owner_;
        minimumFeeBps = minimumFeeBps_;
        emit OwnershipTransferred(address(0), owner_);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert PausedState();
        _;
    }

    modifier nonReentrant() {
        if (locked != 1) revert Reentrancy();
        locked = 2;
        _;
        locked = 1;
    }

    function createPayment(
        bytes32 identityHash,
        uint256 amount,
        uint64 expiresAt,
        bool cancellable,
        uint16 feeBps
    ) external whenNotPaused nonReentrant returns (uint256 paymentId) {
        if (identityHash == bytes32(0) || amount == 0 || expiresAt <= block.timestamp) revert InvalidPayment();
        if (feeBps < minimumFeeBps || feeBps > MAX_FEE_BPS) revert InvalidFee();

        uint256 fee = (amount * feeBps + 9_999) / 10_000;
        paymentId = ++nextPaymentId;
        payments[paymentId] = Payment({
            sender: msg.sender,
            identityHash: identityHash,
            amount: amount,
            expiresAt: expiresAt,
            cancellable: cancellable,
            status: Status.Pending
        });

        usdc.safeTransferFrom(msg.sender, address(this), amount + fee);
        usdc.safeTransfer(treasury, fee);
        emit PaymentCreated(paymentId, msg.sender, identityHash, amount, fee, expiresAt, cancellable);
    }

    function claim(
        uint256 paymentId,
        address recipient,
        uint64 authorizationExpiresAt,
        bytes calldata signature
    ) external whenNotPaused nonReentrant {
        if (recipient == address(0)) revert InvalidAddress();
        Payment storage payment = _pendingPayment(paymentId);
        if (block.timestamp > payment.expiresAt || block.timestamp > authorizationExpiresAt) revert Expired();

        bytes32 digest = claimDigest(paymentId, recipient, authorizationExpiresAt);
        if (usedClaimDigests[digest]) revert BadSignature();
        if (_recoverEthSigned(digest, signature) != verifier) revert BadSignature();

        usedClaimDigests[digest] = true;
        payment.status = Status.Claimed;
        usdc.safeTransfer(recipient, payment.amount);
        emit PaymentClaimed(paymentId, recipient);
    }

    // Refund and cancellation deliberately remain available while paused.
    function refundExpired(uint256 paymentId) external nonReentrant {
        Payment storage payment = _pendingPayment(paymentId);
        if (msg.sender != payment.sender) revert Unauthorized();
        if (block.timestamp <= payment.expiresAt) revert NotExpired();
        payment.status = Status.Refunded;
        usdc.safeTransfer(payment.sender, payment.amount);
        emit PaymentRefunded(paymentId);
    }

    function cancel(uint256 paymentId) external nonReentrant {
        Payment storage payment = _pendingPayment(paymentId);
        if (msg.sender != payment.sender || !payment.cancellable) revert Unauthorized();
        payment.status = Status.Cancelled;
        usdc.safeTransfer(payment.sender, payment.amount);
        emit PaymentCancelled(paymentId);
    }

    function claimDigest(
        uint256 paymentId,
        address recipient,
        uint64 authorizationExpiresAt
    ) public view returns (bytes32) {
        return keccak256(abi.encode(
            "HANDLEPAY_CLAIM",
            block.chainid,
            address(this),
            paymentId,
            recipient,
            authorizationExpiresAt
        ));
    }

    function setVerifier(address verifier_) external onlyOwner {
        if (verifier_ == address(0)) revert InvalidAddress();
        verifier = verifier_;
        emit VerifierUpdated(verifier_);
    }

    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert InvalidAddress();
        treasury = treasury_;
        emit TreasuryUpdated(treasury_);
    }

    function setMinimumFeeBps(uint16 feeBps_) external onlyOwner {
        if (feeBps_ > MAX_FEE_BPS) revert InvalidFee();
        minimumFeeBps = feeBps_;
        emit MinimumFeeUpdated(feeBps_);
    }

    function setPaused(bool paused_) external onlyOwner {
        paused = paused_;
        emit Paused(paused_);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert Unauthorized();
        address oldOwner = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipTransferred(oldOwner, owner);
    }

    function _pendingPayment(uint256 paymentId) internal view returns (Payment storage payment) {
        payment = payments[paymentId];
        if (payment.sender == address(0)) revert InvalidPayment();
        if (payment.status != Status.Pending) revert InvalidStatus();
    }

    function _recoverEthSigned(bytes32 digest, bytes calldata signature) internal pure returns (address signer) {
        if (signature.length != 65) revert BadSignature();
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (uint256(s) > SECP256K1_HALF_N) revert BadSignature();
        if (v < 27) v += 27;
        if (v != 27 && v != 28) revert BadSignature();
        bytes32 ethDigest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));
        signer = ecrecover(ethDigest, v, r, s);
        if (signer == address(0)) revert BadSignature();
    }
}
