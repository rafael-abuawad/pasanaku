# pragma version ==0.4.3
# pragma nonreentrancy off
# @license MIT
"""
@title `Pasanaku` Rotating saving decentralized protocol
@custom:contract-name Pasanaku
@license MIT
@author Rafael Abuawad <x.com/rabuawad_>
"""

########################### TEST CONTRACT ###########################
# This code is for testing purposes only, is not production ready and
# is not audited. Everything is subject to change. Use at your own risk.
#####################################################################

# @dev We import the `IERC20` interface,
# which is a built-in interface of the Vyper compiler.
from ethereum.ercs import IERC20


# @dev We import and implement the `IERC165` interface,
# which is a built-in interface of the Vyper compiler.
from ethereum.ercs import IERC165
implements: IERC165


# @dev We import and implement the `IERC1155` interface,
# which is written using standard Vyper syntax.
from snekmate.tokens.interfaces import IERC1155
implements: IERC1155


# @dev We import and implement the `IERC1155MetadataURI`
# interface, which is written using standard Vyper
# syntax.
from snekmate.tokens.interfaces import IERC1155MetadataURI
implements: IERC1155MetadataURI


# @dev We import and initialise the `ownable` module.
from snekmate.auth import ownable as ow
initializes: ow


# @dev We import and initialise the `erc1155` module.
from snekmate.tokens import erc1155
initializes: erc1155[ownable := ow]


# @dev We export all `external` functions
# from the `erc1155` module.
exports: erc1155.__interface__


# @dev The `RotatingSavingsCreated` event is emitted
# when a rotating savings game is created.
event RotatingSavingsCreated:
    participants: DynArray[address, MAX_PARTICIPANTS_COUNT]
    asset: indexed(address)
    amount: uint256
    token_id: indexed(uint256)
    creator: indexed(address)
    created_at: uint256


# @dev The `Deposited` event is emitted when a participant
# deposits into a rotating savings game.
event Deposited:
    participant: indexed(address)
    token_id: indexed(uint256)
    index: uint256
    amount: uint256
    total_deposited: uint256


# @dev The `Claimed` event is emitted when a participant
# claims from a rotating savings game.
event Claimed:
    participant: indexed(address)
    token_id: indexed(uint256)
    index: uint256
    amount: uint256
    total_deposited: uint256


# @dev The `Ended` event is emitted when a
# rotating savings game ends.
event Ended:
    token_id: indexed(uint256)
    last_updated_at: uint256


# @dev The `Recovered` event is emitted when
# a participant recovers a deposited fund.
event Recovered:
    participant: indexed(address)
    token_id: indexed(uint256)
    index: uint256
    amount: uint256


# @dev The protocol fee is the amount of ETH required to create,
# deposit, and claim from a rotating savings game.
PROTOCOL_FEE: constant(uint256) = as_wei_value(0, "ether")


# @dev The token amount is the amount of tokens that are
# minted to each participant when the game is created.
TOKEN_AMOUNT: constant(uint256) = 1


# @dev The maximum number of participants allowed in the game.
MAX_PARTICIPANTS_COUNT: constant(uint256) = 12


# @dev The number of days that a participant has to wait to recover
# their funds if the game becomes stale.
DAYS_30: constant(uint256) = 60 * 60 * 24 * 30


# @dev The supported assets are the assets that can be used
# to create a rotating savings game.
SUPPORTED_ASSETS: immutable(address[3])


# @dev The `RotatingSavings` struct is used to store the
# information about a rotating savings game.
struct RotatingSavings:
    participants: DynArray[address, MAX_PARTICIPANTS_COUNT]
    asset: address
    amount: uint256
    current_index: uint256
    total_deposited: uint256
    token_id: uint256
    ended: bool
    recovered: bool
    creator: address
    created_at: uint256
    last_updated_at: uint256


# @dev The `_token_id_to_rotating_savings` mapping is used to store the
# information about a rotating savings game by its token ID.
_token_id_to_rotating_savings: HashMap[uint256, RotatingSavings]


# @dev The `_deposited` mapping is used to store the information about
# which participants have deposited in a rotating savings game by their address,
# token ID, and index.
# participant address => token_id => index => deposited
_deposited: HashMap[address, HashMap[uint256, HashMap[uint256, bool]]]


# @dev An `uint256` counter variable that sets
# the token ID for each `create` call and
# then increments.
_counter: uint256


@deploy
@payable
def __init__(base_uri_: String[80], supported_assets: address[3]):
    """
    @dev To omit the opcodes for checking the `msg.value`
         in the creation-time EVM bytecode, the constructor
         is declared as `payable`.
    @notice The `owner` role will be assigned to
            the `msg.sender`.
    @param base_uri_ The maximum 80-character user-readable
           string base URI for computing `uri`.
    """
    ow.__init__()
    erc1155.__init__(base_uri_)
    SUPPORTED_ASSETS = supported_assets


@external
@payable
def create(
    asset: address,
    participants: DynArray[address, MAX_PARTICIPANTS_COUNT],
    amount: uint256,
) -> bool:
    """
    @dev Creates a new rotating savings game.
    @notice The creator must pay the protocol fee in the same transaction.
    @param asset The asset to use for the rotating savings.
    @param participants The participants depositing in the rotating savings.
    @param amount The amount to use for the rotating savings.
    @return True if the rotating savings contract was created successfully.
    """
    assert msg.value >= PROTOCOL_FEE  # dev: insufficient fee
    assert asset in SUPPORTED_ASSETS  # dev: unsupported asset
    assert len(participants) > 0  # dev: no participants
    assert len(participants) <= MAX_PARTICIPANTS_COUNT  # dev: too many participants

    # Increment the counter and get the token ID
    token_id: uint256 = self._counter
    self._counter += 1

    # Mint the token to each participant
    for participant: address in participants:
        self._mint(participant, token_id, TOKEN_AMOUNT)

    # Initialize the rotating savings game
    self._token_id_to_rotating_savings[token_id] = RotatingSavings(
        participants=participants,
        asset=asset,
        amount=amount,
        current_index=0,
        total_deposited=0,
        token_id=token_id,
        ended=False,
        recovered=False,
        creator=msg.sender,
        created_at=block.timestamp,
        last_updated_at=block.timestamp,
    )

    # Log the event
    log RotatingSavingsCreated(
        participants=participants,
        asset=asset,
        amount=amount,
        token_id=token_id,
        creator=msg.sender,
        created_at=block.timestamp,
    )
    return True


@external
@payable
def deposit(token_id: uint256) -> bool:
    """
    @dev Deposits an amount of the asset into the rotating savings game.
    @notice The participant must pay the protocol fee in the same transaction.
    @param token_id The token ID of the rotating savings game.
    @return True if the deposit was successful.
    """
    assert msg.value >= PROTOCOL_FEE  # dev: insufficient fee
    assert self._can_deposit(msg.sender, token_id) # dev: cannot deposit

    # Update the last updated at and the total deposited
    rs: RotatingSavings = self._token_id_to_rotating_savings[token_id]
    rs.last_updated_at = block.timestamp
    rs.total_deposited = rs.total_deposited + rs.amount
    self._token_id_to_rotating_savings[token_id] = rs

    # Set the deposited flag
    self._deposited[msg.sender][token_id][rs.current_index] = True

    # Transfer the amount to the contract
    transferred: bool = extcall IERC20(rs.asset).transferFrom(
        msg.sender, self, rs.amount, default_return_value=False
    )
    assert transferred  # dev: transfer failed

    log Deposited(
        participant=msg.sender,
        token_id=token_id,
        index=rs.current_index,
        amount=rs.amount,
        total_deposited=rs.total_deposited,
    )
    return True


@external
@payable
def claim(token_id: uint256) -> bool:
    """
    @dev Claims the yield from the rotating savings game.
    @notice The participant must pay the protocol fee in the same transaction.
    @param token_id The token ID of the rotating savings game.
    @return True if the claim was successful.
    """
    assert msg.value >= PROTOCOL_FEE  # dev: insufficient fee
    assert self._can_claim(msg.sender, token_id) # dev: cannot claim

    # Update the last updated at, the current index, and the total deposited
    rs: RotatingSavings = self._token_id_to_rotating_savings[token_id]
    total_deposited: uint256 = rs.total_deposited

    rs.last_updated_at = block.timestamp
    rs.current_index += 1
    rs.total_deposited = 0
    rs.ended = rs.current_index == len(rs.participants)
    self._token_id_to_rotating_savings[token_id] = rs

    # Transfer the total deposited to the participant
    transferred: bool = extcall IERC20(rs.asset).transfer(
        msg.sender, total_deposited, default_return_value=False
    )
    assert transferred  # dev: transfer failed

    # Log the event
    if rs.ended:
        log Ended(token_id=token_id, last_updated_at=block.timestamp)

    log Claimed(
        participant=msg.sender,
        token_id=token_id,
        index=rs.current_index-1,
        amount=total_deposited,
        total_deposited=total_deposited,
    )
    return True


@external
def recover(token_id: uint256) -> bool:
    """
    @dev Recovers the asset from the rotating savings game.
    @notice participants can recover only if the rotating savings wait time has passed.
        This mechanism is designed to recover funds if for some reason the current
        participant is not able to claim the funds.
    @param token_id The token ID of the rotating savings game.
    @return True if the recovery was successful.
    """
    assert self._can_recover(msg.sender, token_id) # dev: cannot recover

    # Burn the token
    erc1155._burn(msg.sender, token_id, TOKEN_AMOUNT)

    # Update the rotating savings game
    rs: RotatingSavings = self._token_id_to_rotating_savings[token_id]
    rs.total_deposited -= rs.amount
    rs.recovered = True
    self._token_id_to_rotating_savings[token_id] = rs
    self._deposited[msg.sender][token_id][rs.current_index] = False

    # Transfer the amount to the participant
    transferred: bool = extcall IERC20(rs.asset).transfer(
        msg.sender, rs.amount, default_return_value=False
    )
    assert transferred  # dev: transfer failed

    # Log the event
    log Recovered(
        participant=msg.sender,
        token_id=token_id,
        index=rs.current_index,
        amount=rs.amount,
    )
    return True


@external
def collect_protocol_fees():
    """
    @dev Collect the protocol fees.
    @notice The protocol fees are collected from action calls on the contract.
            The fees are collected to the owner of the contract.
    """
    ow._check_owner()
    send(ow.owner, self.balance)


@external
@view
def rotating_savings(token_id: uint256) -> RotatingSavings:
    """
    @dev Returns the rotating savings game by its token ID.
    @param token_id The token ID of the rotating savings game.
    @return The rotating savings game.
    """
    return self._token_id_to_rotating_savings[token_id]


@external
@view
def total_deposited(token_id: uint256) -> uint256:
    """
    @dev Returns the total deposited of the rotating savings game.
    @param token_id The token ID of the rotating savings game.
    @return The total deposited.
    """
    rs: RotatingSavings = self._token_id_to_rotating_savings[token_id]
    return rs.total_deposited


@external
@view
def expected_total_deposited(token_id: uint256, participant: address) -> uint256:
    """
    @dev Returns the expected total deposited of the rotating savings game.
    @param token_id The token ID of the rotating savings game.
    @return The expected total deposited.
    """
    rs: RotatingSavings = self._token_id_to_rotating_savings[token_id]
    return rs.amount * (len(rs.participants) - self._deposits_count(participant, rs))


@external
@view
def beneficiary(token_id: uint256) -> address:
    """
    @dev Returns the current beneficiary of the rotating savings game.
    @param token_id The token ID of the rotating savings game.
    @return The current beneficiary.
    """
    rs: RotatingSavings = self._token_id_to_rotating_savings[token_id]
    if not rs.ended:
        return rs.participants[rs.current_index]
    return empty(address)


@external
@view
def can_claim(participant: address, token_id: uint256) -> bool:
    """
    @dev Returns whether the participant should claim for the given token ID.
    @param participant The participant to check.
    @param token_id The token ID to check.
    @return True if the participant can claim for the given token ID, false otherwise.
    """
    return self._can_claim(participant, token_id)


@external
@view
def can_deposit(participant: address, token_id: uint256) -> bool:
    """
    @dev Returns whether the participant should deposit for the given token ID.
    @param participant The participant to check.
    @param token_id The token ID to check.
    @return True if the participant can deposit for the given token ID, false otherwise.
    """
    return self._can_deposit(participant, token_id)


@external
@view
def can_recover(participant: address, token_id: uint256) -> bool:
    """
    @dev Returns whether the participant should recover for the given token ID.
    @param participant The participant to check.
    @param token_id The token ID to check.
    @return True if the participant can recover for the given token ID, false otherwise.
    """
    return self._can_recover(participant, token_id)


@external
@view
def participants_count(token_id: uint256) -> uint256:
    """
    @dev Returns the participants count of the rotating savings game.
    @param token_id The token ID of the rotating savings game.
    @return The participants count.
    """
    rs: RotatingSavings = self._token_id_to_rotating_savings[token_id]
    return len(rs.participants)


@external
@pure
def protocol_fee() -> uint256:
    """
    @dev Returns the protocol fee.
    @return The protocol fee.
    """
    return PROTOCOL_FEE


@external
@view
def supported_assets() -> address[3]:
    """
    @dev Returns the supported assets.
    @return The supported assets.
    """
    return SUPPORTED_ASSETS


@external
@view
def has_deposited(account: address, token_id: uint256, index: uint256) -> bool:
    """
    @dev Returns whether the account has deposited for the given token ID and index.
    @param account The account to check.
    @param token_id The token ID to check.
    @param index The index to check.
    @return Whether the account has deposited for the given token ID and index.
    """
    return self._deposited[account][token_id][index]


@external
@view
def next_token_id() -> uint256:
    """
    @dev Returns the next token ID.
    @return The next token ID.
    """
    return self._counter


@internal
@view
def _deposits_count(participant: address, rs: RotatingSavings) -> uint256:
    """
    @dev Internal function to return the number of deposits the participant should make.
    @param participant The participant to check.
    @param rs The rotating savings game to check.
    @return The number of deposits the participant should make.
    """
    participant_deposits: uint256 = 0
    for p: address in rs.participants:
        if p == participant:
            participant_deposits += 1
    return participant_deposits


@internal
@view
def _can_deposit(participant: address, token_id: uint256) -> bool:
    """
    @dev Internal function to check if a participant can deposit for the given token ID.
    @param participant The participant to check.
    @param token_id The token ID to check.
    @return True if the participant can deposit for the given token ID, false otherwise.
    """
    rs: RotatingSavings = self._token_id_to_rotating_savings[token_id]
    if rs.ended:
        return False

    return (
        erc1155.total_supply[token_id] != empty(uint256)
        and participant in rs.participants
        and participant != rs.participants[rs.current_index]
        and not rs.ended
        and not rs.recovered
        and not self._deposited[participant][token_id][rs.current_index]
    )


@internal
@view
def _can_claim(participant: address, token_id: uint256) -> bool:
    """
    @dev Internal function to check if a participant can claim for the given token ID.
    @param participant The participant to check.
    @param token_id The token ID to check.
    @return True if the participant can claim for the given token ID, false otherwise.
    """
    rs: RotatingSavings = self._token_id_to_rotating_savings[token_id]
    benefactor_deposits_count: uint256 = self._deposits_count(participant, rs)
    len_participants: uint256 = len(rs.participants)
    min_amount_to_claim: uint256 = rs.amount * (len_participants - benefactor_deposits_count)
    if rs.ended:
        return False

    return (
        erc1155.total_supply[token_id] != empty(uint256)
        and participant in rs.participants
        and participant == rs.participants[rs.current_index]
        and not rs.ended
        and not rs.recovered
        and rs.total_deposited >= min_amount_to_claim
    )


@view
@internal
def _can_recover(participant: address, token_id: uint256) -> bool:
    """
    @dev Internal function to check if a participant can recover
         their deposited funds for the given token ID.
    @param participant The participant to check.
    @param token_id The token ID to check.
    @return True if the participant can recover for the given token ID, false otherwise.
    """
    rs: RotatingSavings = self._token_id_to_rotating_savings[token_id]
    if rs.ended:
        return False

    return (
        erc1155.total_supply[token_id] != empty(uint256)
        and participant in rs.participants
        and participant != rs.participants[rs.current_index]
        and rs.total_deposited > 0
        and self._deposited[participant][token_id][rs.current_index]
        and not rs.ended
        and block.timestamp - rs.last_updated_at >= DAYS_30
    )


@internal
def _mint(owner: address, id: uint256, amount: uint256):
    """
    @dev Creates `amount` tokens of token type `id` and
         transfers them to `owner`, increasing the total
         supply.
    @notice Note that `owner` cannot be the zero address.
    @param owner The 20-byte owner address.
    @param id The 32-byte identifier of the token.
    @param amount The 32-byte token amount to be created.
    """
    assert owner != empty(address)  # dev: mint to the zero address

    erc1155._before_token_transfer(
        empty(address),
        owner,
        erc1155._as_singleton_array(id),
        erc1155._as_singleton_array(amount),
        b"",
    )

    # In the next line, an overflow is not possible
    # due to an arithmetic check of the entire token
    # supply in the function `_before_token_transfer`.
    erc1155.balanceOf[owner][id] = unsafe_add(
        erc1155.balanceOf[owner][id], amount
    )
    log IERC1155.TransferSingle(
        _operator=msg.sender,
        _from=empty(address),
        _to=owner,
        _id=id,
        _value=amount,
    )

    erc1155._after_token_transfer(
        empty(address),
        owner,
        erc1155._as_singleton_array(id),
        erc1155._as_singleton_array(amount),
        b"",
    )
