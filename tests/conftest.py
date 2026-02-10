import pytest
import boa
from src import pasanaku as Pasanaku
from script import mock_erc20s


@pytest.fixture
def deployer():
    addr = boa.env.generate_address()
    boa.env.set_balance(addr, int(10**18))
    return addr


@pytest.fixture
def test_accounts():
    accounts = []
    for _ in range(10):
        addr = boa.env.generate_address()
        boa.env.set_balance(addr, int(10**18))
        accounts.append(addr)
    return accounts


@pytest.fixture
def supported_assets():
    return mock_erc20s.deploy()


@pytest.fixture
def protocol_fee():
    return int(0.000045 * 10**18)  # 0.000045 ETH


@pytest.fixture
def pasanaku_contract(deployer, supported_assets):
    with boa.env.prank(deployer):
        base_uri: str = "https://pasanaku.com/api/v1/token/"
        asset_addresses = [a.address for a in supported_assets]
        return Pasanaku.deploy(base_uri, asset_addresses)


@pytest.fixture
def created_game(
    pasanaku_contract, deployer, test_accounts, protocol_fee, supported_assets
):
    """Create one game with 3 players, return token_id and game params."""
    asset = supported_assets[0]
    players = test_accounts[:3]
    amount = 100 * 10**6  # 100 units with 6 decimals (e.g. USDC)
    token_id = 0
    with boa.env.prank(deployer):
        pasanaku_contract.create(asset.address, players, amount, value=protocol_fee)
    return {
        "token_id": token_id,
        "asset": asset,
        "players": players,
        "amount": amount,
    }


@pytest.fixture
def funded_game(created_game, pasanaku_contract):
    """Game created and each player funded with ERC20 + approval for Pasanaku."""
    asset = created_game["asset"]
    players = created_game["players"]
    amount = created_game["amount"]
    for player in players:
        with boa.env.prank(asset.owner()):
            asset.faucet(player, amount * 20)
        with boa.env.prank(player):
            asset.approve(pasanaku_contract.address, amount * 20)
    return created_game
