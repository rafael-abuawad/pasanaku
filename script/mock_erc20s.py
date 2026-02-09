from src._mocks import mock_erc20 as MockERC20
from moccasin.boa_tools import VyperContract


def deploy() -> list[VyperContract]:
    usdc: VyperContract = MockERC20.deploy(
        "Fake USDC", "USDC", 6, 1000000000000000000, "USDC", "1"
    )
    usdt: VyperContract = MockERC20.deploy(
        "Fake USD₮0", "USDT0", 6, 1000000000000000000, "USDT0", "1"
    )
    weth: VyperContract = MockERC20.deploy(
        "Fake WETH", "WETH", 18, 1000000000000000000, "WETH", "1"
    )
    dai: VyperContract = MockERC20.deploy(
        "Fake DAI", "DAI", 18, 1000000000000000000, "DAI", "1"
    )
    crvusd: VyperContract = MockERC20.deploy(
        "Fake crvUSD", "crv", 18, 1000000000000000000, "crvUS", "1"
    )

    print(f"USDC: {usdc.address}")
    print(f"USDT0: {usdt.address}")
    print(f"WETH: {weth.address}")
    print(f"DAI: {dai.address}")
    print(f"crvUSD: {crvusd.address}")
    return [usdc, usdt, weth, dai, crvusd]


def moccasin_main() -> list[VyperContract]:
    return deploy()
