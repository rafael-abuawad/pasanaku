# pragma version ==0.4.3
# pragma nonreentrancy off
# @license MIT
"""
@title `Pasanaku` Rotating saving decentralized protocol
@custom:contract-name Pasanaku
@license MIT
@author Rafael Abuawad <x.com/rabuawad_>
"""


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
    players: DynArray[address, MAX_PLAYER_COUNT]
    asset: indexed(address)
    amount: uint256
    player_count: uint256
    creator: indexed(address)
    token_id: indexed(uint256)
    created_at: uint256


# @dev The `Deposited` event is emitted when a player
# deposits into a rotating savings game.
event Deposited:
    player: indexed(address)
    token_id: indexed(uint256)
    index: uint256
    amount: uint256
    total_deposited: uint256


# @dev The `Claimed` event is emitted when a player
# claims from a rotating savings game.
event Claimed:
    player: indexed(address)
    token_id: indexed(uint256)
    index: uint256
    amount: uint256
    total_deposited: uint256


# @dev The `Ended` event is emitted when a
# rotating savings game ends.
event Ended:
    token_id: indexed(uint256)
    last_updated_at: uint256


event Recovered:
    player: indexed(address)
    token_id: indexed(uint256)
    index: uint256
    amount: uint256


# @dev The protocol fee is the amount of ETH required to create,
# deposit, and claim from a rotating savings game.
PROTOCOL_FEE: constant(uint256) = as_wei_value(0.000045, "ether")


# @dev The token amount is the amount of tokens that are
# minted to each player when the game is created.
TOKEN_AMOUNT: constant(uint256) = 1


# @dev The maximum number of players allowed in the game.
MAX_PLAYER_COUNT: constant(uint256) = 12


# @dev The number of days that a player has to wait to recover
# their funds if the game becomes stale.
DAYS_30: constant(uint256) = 60 * 60 * 24 * 30


# @dev The supported assets are the assets that can be used
# to create a rotating savings game.
SUPPORTED_ASSETS: immutable(address[5])


# @dev The `RotatingSavings` struct is used to store the
# information about a rotating savings game.
struct RotatingSavings:
    players: DynArray[address, MAX_PLAYER_COUNT]
    asset: address
    amount: uint256
    player_count: uint256
    current_player_index: uint256
    creator: address
    total_deposited: uint256
    token_id: uint256
    ended: bool
    created_at: uint256
    last_updated_at: uint256


# @dev The `_token_id_to_rotating_savings` mapping is used to store the
# information about a rotating savings game by its token ID.
_token_id_to_rotating_savings: HashMap[uint256, RotatingSavings]


# @dev The `_deposited` mapping is used to store the information about
# which players have deposited in a rotating savings game by their address,
# token ID, and index.
# player address => token_id => index => deposited
_deposited: HashMap[address, HashMap[uint256, HashMap[uint256, bool]]]


# @dev An `uint256` counter variable that sets
# the token ID for each `create` call and
# then increments.
_counter: uint256


@deploy
@payable
def __init__(base_uri_: String[80], supported_assets: address[5]):
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
    players: DynArray[address, MAX_PLAYER_COUNT],
    amount: uint256,
) -> bool:
    """
    @dev Creates a new rotating savings game.
    @notice The creator must pay the protocol fee in the same transaction.
    @param asset The asset to use for the rotating savings.
    @param players The players to use for the rotating savings.
    @param amount The amount to use for the rotating savings.
    @return True if the rotating savings contract was created successfully.
    """
    assert msg.value >= PROTOCOL_FEE  # dev: insufficient fee
    assert asset in SUPPORTED_ASSETS  # dev: unsupported asset

    # Increment the counter and get the token ID
    token_id: uint256 = self._counter
    self._counter += 1

    # Mint the token to each player
    for player: address in players:
        self._mint(player, token_id, TOKEN_AMOUNT)


    # Create the rotating savings
    rotating_savings: RotatingSavings = RotatingSavings(
        players=players,
        asset=asset,
        amount=amount,
        player_count=len(players),
        current_player_index=0,
        creator=msg.sender,
        total_deposited=0,
        token_id=token_id,
        ended=False,
        created_at=block.timestamp,
        last_updated_at=block.timestamp,
    )

    self._token_id_to_rotating_savings[token_id] = rotating_savings

    # Log the event
    log RotatingSavingsCreated(
        players=players,
        asset=asset,
        amount=amount,
        player_count=len(players),
        creator=msg.sender,
        token_id=token_id,
        created_at=block.timestamp,
    )

    return True


@external
@payable
def deposit(token_id: uint256) -> bool:
    """
    @dev Deposits an amount of the asset into the rotating savings game.
    @notice The player must pay the protocol fee in the same transaction.
    @param token_id The token ID of the rotating savings game.
    @return True if the deposit was successful.
    """
    assert msg.value >= PROTOCOL_FEE  # dev: insufficient fee
    assert erc1155.total_supply[token_id] != empty(
        uint256
    )  # dev: token does not exist

    rs: RotatingSavings = self._token_id_to_rotating_savings[token_id]
    assert not rs.ended  # dev: rotating savings has ended
    assert msg.sender in rs.players  # dev: not a player
    assert (
        rs.players[rs.current_player_index] != msg.sender
    )  # dev: current player should not deposit
    assert not self._deposited[msg.sender][token_id][
        rs.current_player_index
    ]  # dev: already deposited

    # Set the deposited flag
    self._deposited[msg.sender][token_id][rs.current_player_index] = True

    # Update the total deposited
    total_deposited: uint256 = rs.total_deposited + rs.amount
    rs.total_deposited = total_deposited

    # Update the last updated at
    rs.last_updated_at = block.timestamp

    # Update the rotating savings
    self._token_id_to_rotating_savings[token_id] = rs

    # Transfer the amount to the contract
    transfered: bool = extcall IERC20(rs.asset).transferFrom(
        msg.sender, self, rs.amount, default_return_value=False
    )
    assert transfered  # dev: transfer failed

    # Log the event
    log Deposited(
        player=msg.sender,
        token_id=token_id,
        index=rs.current_player_index,
        amount=rs.amount,
        total_deposited=total_deposited,
    )

    return True


@external
@payable
def claim(token_id: uint256) -> bool:
    """
    @dev Claims the yield from the rotating savings game.
    @notice The player must pay the protocol fee in the same transaction.
    @param token_id The token ID of the rotating savings game.
    @return True if the claim was successful.
    """
    assert erc1155.total_supply[token_id] != empty(
        uint256
    )  # dev: token does not exist
    assert msg.value >= PROTOCOL_FEE  # dev: insufficient fee

    # Get the rotating savings
    rs: RotatingSavings = self._token_id_to_rotating_savings[token_id]
    assert not rs.ended  # dev: rotating savings has ended

    # Calculate the expected total deposited
    expected_total_deposited: uint256 = rs.amount * (len(rs.players) - 1)
    assert (
        rs.total_deposited >= expected_total_deposited
    )  # dev: not all players have deposited

    # Reset the total deposited
    amount_to_transfer: uint256 = rs.total_deposited
    rs.total_deposited = 0

    # Update the current player index
    rs.current_player_index += 1

    # Update the last updated at
    rs.last_updated_at = block.timestamp

    # Check if the rotating savings has ended by
    # checking if the current player index is equal to the number of players
    if rs.current_player_index == len(rs.players) - 1:
        rs.ended = True
        log Ended(token_id=token_id, last_updated_at=block.timestamp)


    # Update the rotating savings
    self._token_id_to_rotating_savings[token_id] = rs

    # Transfer the total deposited to the player
    transfered: bool = extcall IERC20(rs.asset).transfer(
        msg.sender, amount_to_transfer, default_return_value=False
    )
    assert transfered  # dev: transfer failed

    # Log the event
    log Claimed(
        player=msg.sender,
        token_id=token_id,
        index=rs.current_player_index,
        amount=rs.total_deposited,
        total_deposited=rs.total_deposited,
    )

    return True


@external
def recover(token_id: uint256) -> bool:
    """
    @dev Recovers the asset from the rotating savings game.
    @notice Players can reover only if the rotating savings wait time has passed.
        Thsi mechanism is to designed to recover funds if for some reason the current
        player is not able to claim the funds.
    @param token_id The token ID of the rotating savings game.
    @return True if the recovery was successful.
    """
    assert erc1155.total_supply[token_id] != empty(uint256)  # dev: token does not exist

    # Get the rotating savings
    rs: RotatingSavings = self._token_id_to_rotating_savings[token_id]
    assert not rs.ended  # dev: rotating savings has ended
    assert block.timestamp - rs.last_updated_at >= DAYS_30 # dev: not enough time has passed
    assert self._deposited[msg.sender][token_id][rs.current_player_index]  # dev: not deposited
    assert rs.total_deposited > 0  # dev: no funds left to recover

    # Burn the token
    erc1155._burn(msg.sender, token_id, 1)

    # Update the total deposited
    rs.total_deposited -= rs.amount
    self._token_id_to_rotating_savings[token_id] = rs

    # Transfer the amount to the player
    transfered: bool = extcall IERC20(rs.asset).transfer(
        msg.sender, rs.amount, default_return_value=False
    )
    assert transfered  # dev: transfer failed

    # Log the event
    log Recovered(
        player=msg.sender,
        token_id=token_id,
        index=rs.current_player_index,
        amount=rs.amount,
    )

    return True


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
def can_be_recovered(token_id: uint256) -> bool:
    """
    @dev Returns whether the rotating savings game can be recovered.
    @param token_id The token ID of the rotating savings game.
    @return Whether the rotating savings game can be recovered.
    """
    rs: RotatingSavings = self._token_id_to_rotating_savings[token_id]
    return (
        block.timestamp - rs.last_updated_at >= DAYS_30
        and not rs.ended
        and rs.total_deposited > 0
    )


@external
@view
def can_be_claimed(token_id: uint256) -> bool:
    """
    @dev Returns whether the rotating savings game can be claimed.
    @param token_id The token ID of the rotating savings game.
    @return Whether the rotating savings game can be claimed.
    """
    rs: RotatingSavings = self._token_id_to_rotating_savings[token_id]
    return (
        not rs.ended
        and rs.current_player_index == len(rs.players) - 1
        and block.timestamp - rs.last_updated_at >= DAYS_30
    )


@external
@view
def current_player(token_id: uint256) -> address:
    """
    @dev Returns the current player of the rotating savings game.
    @param token_id The token ID of the rotating savings game.
    @return The current player.
    """
    rs: RotatingSavings = self._token_id_to_rotating_savings[token_id]
    return rs.players[rs.current_player_index]


@external
@view
def player_count(token_id: uint256) -> uint256:
    """
    @dev Returns the player count of the rotating savings game.
    @param token_id The token ID of the rotating savings game.
    @return The player count.
    """
    rs: RotatingSavings = self._token_id_to_rotating_savings[token_id]
    return rs.player_count


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
def supported_assets() -> address[5]:
    """
    @dev Returns the supported assets.
    @return The supported assets.
    """
    return SUPPORTED_ASSETS


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
    assert owner != empty(address), "Pasanaku: mint to the zero address"

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
