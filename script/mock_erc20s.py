from src._mocks import mock_erc20 as MockERC20
from moccasin.boa_tools import VyperContract

INITIAL_SUPPLY = 1000000000000000000


def deploy() -> list[VyperContract]:
    crvusd: VyperContract = MockERC20.deploy(
        "Fake crvUSD", "crvUS", 18, INITIAL_SUPPLY, "crvUSD", "1"
    )
    scrvusd: VyperContract = MockERC20.deploy(
        "Fake Savings crvUSD", "scrvU", 18, INITIAL_SUPPLY, "scrvUSD", "1"
    )
    dai: VyperContract = MockERC20.deploy(
        "Fake Dai Stablecoin", "DAI", 18, INITIAL_SUPPLY, "DAI", "1"
    )
    mim: VyperContract = MockERC20.deploy(
        "Fake Magic Internet Money", "MIM", 18, INITIAL_SUPPLY, "MIM", "1"
    )
    pyusd: VyperContract = MockERC20.deploy(
        "Fake PayPal USD", "PYUSD", 6, INITIAL_SUPPLY, "PYUSD", "1"
    )
    usds: VyperContract = MockERC20.deploy(
        "Fake USDS", "USDS", 18, INITIAL_SUPPLY, "USDS", "1"
    )
    susds: VyperContract = MockERC20.deploy(
        "Fake Savings USDS", "sUSDS", 18, INITIAL_SUPPLY, "sUSDS", "1"
    )
    usdc: VyperContract = MockERC20.deploy(
        "Fake USD Coin", "USDC", 6, INITIAL_SUPPLY, "USDC", "1"
    )
    usdt0: VyperContract = MockERC20.deploy(
        "Fake USD\u20ae0", "USDT0", 6, INITIAL_SUPPLY, "USDT0", "1"
    )

    print(f"crvUSD:  {crvusd.address}")
    print(f"scrvUSD: {scrvusd.address}")
    print(f"DAI:     {dai.address}")
    print(f"MIM:     {mim.address}")
    print(f"PYUSD:   {pyusd.address}")
    print(f"USDS:    {usds.address}")
    print(f"sUSDS:   {susds.address}")
    print(f"USDC:    {usdc.address}")
    print(f"USDT0:   {usdt0.address}")

    return [crvusd, scrvusd, dai, mim, pyusd, usds, susds, usdc, usdt0]


def moccasin_main() -> list[VyperContract]:
    return deploy()
