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
        return Pasanaku.deploy(base_uri, supported_assets)
