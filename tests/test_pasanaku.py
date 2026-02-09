import boa
import random


def test_pasanaku_owner(pasanaku_contract, deployer):
    assert pasanaku_contract.owner() == deployer


def test_pasanaku_supported_assets(pasanaku_contract, supported_assets):
    for asset in supported_assets:
        assert asset.address in pasanaku_contract.supported_assets()


def test_pasanaku_create(
    pasanaku_contract, deployer, test_accounts, protocol_fee, supported_assets
):
    token_id = 0
    assert pasanaku_contract.total_supply(token_id) == 0

    with boa.env.prank(deployer):
        asset = random.choice(supported_assets)
        players = random.sample(test_accounts, random.randint(2, 12))
        amount = random.randint(1, 1000000000000000000)
        pasanaku_contract.create(asset.address, players, amount, value=protocol_fee)

        assert pasanaku_contract.total_supply(token_id) == len(players)
