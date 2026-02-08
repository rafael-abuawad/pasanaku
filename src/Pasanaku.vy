# pragma version ==0.4.3
# pragma nonreentrancy off
# @license MIT
"""
@title `Pasanaku` Rotating saving decentralized exchange
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


event RotatingSavingsCreated:
    players: DynArray[address, MAX_PLAYER_COUNT]
    asset: indexed(address)
    amount: uint256
    player_count: uint256
    creator: indexed(address)
    token_id: indexed(uint256)


event Deposited:
    player: indexed(address)
    token_id: indexed(uint256)
    index: uint256
    amount: uint256
    total_deposited: uint256


MAX_PLAYER_COUNT: constant(uint256) = 12


struct RotatingSavings:
    players: DynArray[address, MAX_PLAYER_COUNT]
    asset: address
    amount: uint256
    player_count: uint256
    current_player_index: uint256
    creator: address
    total_deposited: uint256
    created_at: uint256
    last_updated_at: uint256


token_id_to_rotating_savings: HashMap[uint256, RotatingSavings]

# player address => token_id => index => deposited
deposited: HashMap[address, HashMap[uint256, HashMap[uint256, bool]]]


# @dev An `uint256` counter variable that sets
# the token ID for each `create` call and
# then increments.
_counter: uint256


@deploy
@payable
def __init__(base_uri_: String[80]):
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


@external
def create(
    asset: address,
    players: DynArray[address, MAX_PLAYER_COUNT],
    amount: uint256,
) -> bool:
    token_id: uint256 = self._counter
    self._counter += 1

    token_amount: uint256 = 1
    for player: address in players:
        self._mint(player, token_id, token_amount)

    rotating_savings: RotatingSavings = RotatingSavings(
        players=players,
        asset=asset,
        amount=amount,
        player_count=len(players),
        current_player_index=0,
        creator=msg.sender,
        total_deposited=0,
        created_at=block.timestamp,
        last_updated_at=block.timestamp,
    )

    self.token_id_to_rotating_savings[token_id] = rotating_savings
    log RotatingSavingsCreated(
        players=players,
        asset=asset,
        amount=amount,
        player_count=len(players),
        creator=msg.sender,
        token_id=token_id,
    )
    return True


@external
def deposit(token_id: uint256, amount: uint256) -> bool:
    assert erc1155.total_supply[token_id] != empty(
        uint256
    )  # dev: token does not exist
    assert amount > 0  # dev: amount is zero

    rs: RotatingSavings = self.token_id_to_rotating_savings[token_id]
    assert rs.amount == amount, "Pasanaku: amount mismatch"
    assert msg.sender in rs.players, "Pasanaku: not a player"
    assert not self.deposited[msg.sender][token_id][
        rs.current_player_index
    ], "Pasanaku: already deposited"

    self.deposited[msg.sender][token_id][rs.current_player_index] = True
    rs.last_updated_at = block.timestamp

    total_deposited: uint256 = rs.total_deposited + amount
    self.token_id_to_rotating_savings[
        token_id
    ].total_deposited = total_deposited

    log Deposited(
        player=msg.sender,
        token_id=token_id,
        index=rs.current_player_index,
        amount=amount,
        total_deposited=total_deposited,
    )

    # TODO: Transfer the amount to FLuid to generate yield
    extcall IERC20(rs.asset).transferFrom(msg.sender, self, amount)

    return True


@external
def claim(token_id: uint256) -> bool:
    rs: RotatingSavings = self.token_id_to_rotating_savings[token_id]
    expected_total_deposited: uint256 = rs.amount * (len(rs.players) - 1)
    assert (
        rs.total_deposited >= expected_total_deposited
    ), "Pasanaku: total deposited mismatch"


    # TODO: Claim the yield, and transfer the amount to the player, minus the fees
    extcall IERC20(rs.asset).transfer(msg.sender, rs.total_deposited)

    return True


@external
@pure
def max_player_count() -> uint256:
    """
    @dev Returns the maximum number of players allowed in the game.
    @return The maximum number of players allowed in the game.
    """
    return MAX_PLAYER_COUNT


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
