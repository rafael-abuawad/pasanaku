import boa
import random

from conftest import get_rotating_savings

# 30 days in seconds, for recover time condition
DAYS_30 = 60 * 60 * 24 * 30


# --- Existing / owner / config ---


def test_pasanaku_owner(pasanaku_contract, deployer):
    assert pasanaku_contract.owner() == deployer


def test_pasanaku_supported_assets(pasanaku_contract, supported_assets):
    pasanaku_contract_supported_assets = pasanaku_contract.supported_assets()
    assert len(pasanaku_contract_supported_assets) == len(supported_assets)

    for asset in supported_assets:
        assert asset.address in pasanaku_contract_supported_assets


def test_pasanaku_create(
    pasanaku_contract, deployer, test_accounts, protocol_fee, supported_assets
):
    token_id = 0
    assert pasanaku_contract.total_supply(token_id) == 0

    with boa.env.prank(deployer):
        asset = random.choice(supported_assets)
        players = random.sample(
            test_accounts, random.randint(2, min(10, len(test_accounts)))
        )
        amount = random.randint(1, 1000000000000000000)
        pasanaku_contract.create(asset.address, players, amount, value=protocol_fee)

        assert pasanaku_contract.total_supply(token_id) == len(players)


# --- Create ---


def test_create_reverts_insufficient_fee(
    pasanaku_contract, deployer, test_accounts, supported_assets, protocol_fee
):
    if protocol_fee > 0:
        with boa.env.prank(deployer):
            with boa.reverts(dev="insufficient fee"):
                pasanaku_contract.create(
                    supported_assets[0].address,
                    test_accounts[:2],
                    100,
                    value=protocol_fee - 1,
                )
    # When protocol_fee is 0, create with value=0 succeeds (no revert)


def test_create_reverts_unsupported_asset(
    pasanaku_contract, deployer, test_accounts, protocol_fee
):
    unsupported = boa.env.generate_address()
    with boa.env.prank(deployer):
        with boa.reverts(dev="unsupported asset"):
            pasanaku_contract.create(
                unsupported,
                test_accounts[:2],
                100,
                value=protocol_fee,
            )


def test_create_success_stores_rotating_savings(created_game, pasanaku_contract):
    token_id = created_game["token_id"]
    asset = created_game["asset"]
    players = created_game["players"]
    amount = created_game["amount"]

    rs = get_rotating_savings(pasanaku_contract, token_id)
    assert list(rs.participants) == list(players)
    assert rs.asset == asset.address
    assert rs.amount == amount
    assert len(rs.participants) == 3
    assert rs.current_index == 0
    assert rs.total_deposited == 0
    assert rs.token_id == token_id
    assert rs.ended is False


def test_create_emits_rotating_savings_created(
    pasanaku_contract, deployer, created_game, protocol_fee
):
    # created_game already created one; create another and check stored data
    with boa.env.prank(deployer):
        pasanaku_contract.create(
            created_game["asset"].address,
            created_game["players"],
            created_game["amount"],
            value=protocol_fee,
        )
    rs = get_rotating_savings(pasanaku_contract, 1)
    assert rs.asset == created_game["asset"].address
    assert rs.amount == created_game["amount"]
    assert len(rs.participants) == 3


def test_create_mints_one_token_per_player(created_game, pasanaku_contract):
    token_id = created_game["token_id"]
    players = created_game["players"]
    for player in players:
        assert pasanaku_contract.balanceOf(player, token_id) == 1


def test_create_increments_token_id(
    pasanaku_contract, deployer, test_accounts, protocol_fee, supported_assets
):
    with boa.env.prank(deployer):
        pasanaku_contract.create(
            supported_assets[0].address,
            test_accounts[:2],
            100,
            value=protocol_fee,
        )
    with boa.env.prank(deployer):
        pasanaku_contract.create(
            supported_assets[0].address,
            test_accounts[2:4],
            200,
            value=protocol_fee,
        )
    assert get_rotating_savings(pasanaku_contract, 0).token_id == 0
    assert get_rotating_savings(pasanaku_contract, 1).token_id == 1


# --- Deposit ---


def test_deposit_reverts_insufficient_fee(funded_game, pasanaku_contract, protocol_fee):
    if protocol_fee == 0:
        return  # With fee 0, value=0 does not revert
    token_id = funded_game["token_id"]
    players = funded_game["players"]
    with boa.env.prank(players[1]):
        with boa.reverts(dev="insufficient fee"):
            pasanaku_contract.deposit(token_id, value=protocol_fee - 1)


def test_deposit_reverts_token_does_not_exist(
    funded_game, pasanaku_contract, protocol_fee
):
    with boa.env.prank(funded_game["players"][1]):
        with boa.reverts(dev="cannot deposit"):
            pasanaku_contract.deposit(999, value=protocol_fee)


def test_deposit_reverts_not_player(
    funded_game, pasanaku_contract, protocol_fee, test_accounts
):
    non_player = test_accounts[5]
    with boa.env.prank(non_player):
        with boa.reverts(dev="cannot deposit"):
            pasanaku_contract.deposit(funded_game["token_id"], value=protocol_fee)


def test_deposit_reverts_current_player_cannot_deposit(
    funded_game, pasanaku_contract, protocol_fee
):
    token_id = funded_game["token_id"]
    players = funded_game["players"]
    current_recipient = players[0]
    with boa.env.prank(current_recipient):
        with boa.reverts(dev="cannot deposit"):
            pasanaku_contract.deposit(token_id, value=protocol_fee)


def test_deposit_reverts_already_deposited(
    funded_game, pasanaku_contract, protocol_fee
):
    token_id = funded_game["token_id"]
    players = funded_game["players"]
    with boa.env.prank(players[1]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    with boa.env.prank(players[1]):
        with boa.reverts(dev="cannot deposit"):
            pasanaku_contract.deposit(token_id, value=protocol_fee)


def test_deposit_success_updates_state(funded_game, pasanaku_contract, protocol_fee):
    token_id = funded_game["token_id"]
    players = funded_game["players"]
    amount = funded_game["amount"]
    with boa.env.prank(players[1]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    assert pasanaku_contract.total_deposited(token_id) == amount


def test_deposit_transfers_erc20_to_contract(
    funded_game, pasanaku_contract, protocol_fee
):
    token_id = funded_game["token_id"]
    asset = funded_game["asset"]
    players = funded_game["players"]
    amount = funded_game["amount"]
    balance_before = asset.balanceOf(pasanaku_contract.address)
    with boa.env.prank(players[1]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    assert asset.balanceOf(pasanaku_contract.address) == balance_before + amount


def test_deposit_all_non_recipients_then_total(
    funded_game, pasanaku_contract, protocol_fee
):
    token_id = funded_game["token_id"]
    players = funded_game["players"]
    amount = funded_game["amount"]
    with boa.env.prank(players[1]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    with boa.env.prank(players[2]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    assert pasanaku_contract.total_deposited(token_id) == 2 * amount


# --- Claim ---


def test_claim_reverts_token_does_not_exist(pasanaku_contract, deployer, protocol_fee):
    with boa.env.prank(deployer):
        with boa.reverts(dev="cannot claim"):
            pasanaku_contract.claim(999, value=protocol_fee)


def test_claim_reverts_insufficient_fee(funded_game, pasanaku_contract, protocol_fee):
    if protocol_fee == 0:
        return  # With fee 0, value=0 does not revert
    token_id = funded_game["token_id"]
    players = funded_game["players"]
    with boa.env.prank(players[1]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    with boa.env.prank(players[2]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    with boa.env.prank(players[0]):
        with boa.reverts(dev="insufficient fee"):
            pasanaku_contract.claim(token_id, value=protocol_fee - 1)


def test_claim_reverts_not_all_deposited(funded_game, pasanaku_contract, protocol_fee):
    token_id = funded_game["token_id"]
    players = funded_game["players"]
    with boa.env.prank(players[1]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    with boa.env.prank(players[0]):
        with boa.reverts(dev="cannot claim"):
            pasanaku_contract.claim(token_id, value=protocol_fee)


def test_claim_success_advances_index_and_resets_total(
    funded_game, pasanaku_contract, protocol_fee
):
    token_id = funded_game["token_id"]
    asset = funded_game["asset"]
    players = funded_game["players"]
    amount = funded_game["amount"]
    with boa.env.prank(players[1]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    with boa.env.prank(players[2]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    recipient = players[0]
    balance_before = asset.balanceOf(recipient)
    with boa.env.prank(recipient):
        pasanaku_contract.claim(token_id, value=protocol_fee)
    rs = get_rotating_savings(pasanaku_contract, token_id)
    assert rs.current_index == 1
    assert pasanaku_contract.total_deposited(token_id) == 0
    expected_pot = amount * 2
    assert asset.balanceOf(recipient) == balance_before + expected_pot


def test_claim_last_round_ends_game(
    pasanaku_contract, deployer, test_accounts, protocol_fee, supported_assets
):
    """With 2 players, game ends after 2 rounds (each player claims once)."""
    asset = supported_assets[0]
    players = test_accounts[:2]
    amount = 100 * 10**6
    with boa.env.prank(deployer):
        pasanaku_contract.create(asset.address, players, amount, value=protocol_fee)
    for p in players:
        with boa.env.prank(asset.owner()):
            asset.faucet(p, amount * 5)
        with boa.env.prank(p):
            asset.approve(pasanaku_contract.address, amount * 5)
    token_id = 0
    # Round 0: p1 deposits, p0 claims
    with boa.env.prank(players[1]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    balance_before = asset.balanceOf(players[0])
    with boa.env.prank(players[0]):
        pasanaku_contract.claim(token_id, value=protocol_fee)
    assert asset.balanceOf(players[0]) == balance_before + amount
    # Round 1: p0 deposits, p1 claims -> game ends
    with boa.env.prank(players[0]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    balance_before_p1 = asset.balanceOf(players[1])
    with boa.env.prank(players[1]):
        pasanaku_contract.claim(token_id, value=protocol_fee)
    assert get_rotating_savings(pasanaku_contract, token_id).ended is True
    assert asset.balanceOf(players[1]) == balance_before_p1 + amount


def test_claim_reverts_game_ended(
    pasanaku_contract, deployer, test_accounts, protocol_fee, supported_assets
):
    asset = supported_assets[0]
    players = test_accounts[:2]
    amount = 100 * 10**6
    with boa.env.prank(deployer):
        pasanaku_contract.create(asset.address, players, amount, value=protocol_fee)
    for p in players:
        with boa.env.prank(asset.owner()):
            asset.faucet(p, amount * 5)
        with boa.env.prank(p):
            asset.approve(pasanaku_contract.address, amount * 5)
    token_id = 0
    with boa.env.prank(players[1]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    with boa.env.prank(players[0]):
        pasanaku_contract.claim(token_id, value=protocol_fee)
    with boa.env.prank(players[0]):
        with boa.reverts(dev="cannot claim"):
            pasanaku_contract.claim(token_id, value=protocol_fee)


# --- Recover ---


def test_recover_reverts_token_does_not_exist(pasanaku_contract, test_accounts):
    with boa.env.prank(test_accounts[0]):
        with boa.reverts(dev="cannot recover"):
            pasanaku_contract.recover(999)


def test_recover_reverts_game_ended(
    pasanaku_contract, deployer, test_accounts, protocol_fee, supported_assets
):
    asset = supported_assets[0]
    players = test_accounts[:2]
    amount = 100 * 10**6
    with boa.env.prank(deployer):
        pasanaku_contract.create(asset.address, players, amount, value=protocol_fee)
    for p in players:
        with boa.env.prank(asset.owner()):
            asset.faucet(p, amount * 5)
        with boa.env.prank(p):
            asset.approve(pasanaku_contract.address, amount * 5)
    token_id = 0
    with boa.env.prank(players[1]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    with boa.env.prank(players[0]):
        pasanaku_contract.claim(token_id, value=protocol_fee)
    boa.env.time_travel(seconds=DAYS_30)
    with boa.env.prank(players[0]):
        with boa.reverts(dev="cannot recover"):
            pasanaku_contract.recover(token_id)


def test_recover_reverts_not_deposited(funded_game, pasanaku_contract):
    token_id = funded_game["token_id"]
    players = funded_game["players"]
    boa.env.time_travel(seconds=DAYS_30)
    with boa.env.prank(players[0]):
        with boa.reverts(dev="cannot recover"):
            pasanaku_contract.recover(token_id)


def test_recover_reverts_no_funds(funded_game, pasanaku_contract, protocol_fee):
    # After claim, total_deposited is 0 and round advanced; recover reverts
    token_id = funded_game["token_id"]
    players = funded_game["players"]
    with boa.env.prank(players[1]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    with boa.env.prank(players[2]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    with boa.env.prank(players[0]):
        pasanaku_contract.claim(token_id, value=protocol_fee)
    boa.env.time_travel(seconds=DAYS_30)
    with boa.env.prank(players[1]):
        with boa.reverts(dev="cannot recover"):
            pasanaku_contract.recover(token_id)


def test_recover_reverts_time_condition(funded_game, pasanaku_contract, protocol_fee):
    token_id = funded_game["token_id"]
    players = funded_game["players"]
    with boa.env.prank(players[1]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    with boa.env.prank(players[1]):
        with boa.reverts(dev="cannot recover"):
            pasanaku_contract.recover(token_id)


def test_recover_success_after_30_days(funded_game, pasanaku_contract, protocol_fee):
    token_id = funded_game["token_id"]
    asset = funded_game["asset"]
    players = funded_game["players"]
    amount = funded_game["amount"]
    with boa.env.prank(players[1]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    balance_before = asset.balanceOf(players[1])
    assert pasanaku_contract.balanceOf(players[1], token_id) == 1
    boa.env.time_travel(seconds=DAYS_30)
    with boa.env.prank(players[1]):
        pasanaku_contract.recover(token_id)
    assert pasanaku_contract.balanceOf(players[1], token_id) == 0
    assert pasanaku_contract.total_deposited(token_id) == 0
    assert get_rotating_savings(pasanaku_contract, token_id).recovered is True
    assert asset.balanceOf(players[1]) == balance_before + amount


# --- Collect protocol fees ---


def test_collect_protocol_fees_reverts_not_owner(
    pasanaku_contract, deployer, test_accounts, protocol_fee
):
    with boa.env.prank(deployer):
        # Ensure contract has some balance (e.g. from a create)
        pasanaku_contract.create(
            pasanaku_contract.supported_assets()[0],
            test_accounts[:2],
            100,
            value=protocol_fee,
        )
    non_owner = test_accounts[5]
    with boa.env.prank(non_owner):
        with boa.reverts("ownable: caller is not the owner"):
            pasanaku_contract.collect_protocol_fees()


def test_collect_protocol_fees_success_sends_balance_to_owner(
    pasanaku_contract, deployer, test_accounts, protocol_fee, supported_assets
):
    with boa.env.prank(deployer):
        pasanaku_contract.create(
            supported_assets[0].address,
            test_accounts[:2],
            100,
            value=protocol_fee,
        )
    owner_balance_before = boa.env.get_balance(deployer)
    contract_balance_before = boa.env.get_balance(pasanaku_contract.address)
    assert contract_balance_before == 0  # protocol_fee is 0
    with boa.env.prank(deployer):
        pasanaku_contract.collect_protocol_fees()
    assert boa.env.get_balance(pasanaku_contract.address) == 0
    assert (
        boa.env.get_balance(deployer) == owner_balance_before + contract_balance_before
    )


# --- Views ---


def test_rotating_savings_returns_struct(created_game, pasanaku_contract):
    token_id = created_game["token_id"]
    rs = get_rotating_savings(pasanaku_contract, token_id)
    assert list(rs.participants) == list(created_game["players"])
    assert rs.asset == created_game["asset"].address
    assert rs.amount == created_game["amount"]


def test_total_deposited_returns_current_pot(
    funded_game, pasanaku_contract, protocol_fee
):
    token_id = funded_game["token_id"]
    players = funded_game["players"]
    amount = funded_game["amount"]
    assert pasanaku_contract.total_deposited(token_id) == 0
    with boa.env.prank(players[1]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    assert pasanaku_contract.total_deposited(token_id) == amount
    with boa.env.prank(players[2]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    assert pasanaku_contract.total_deposited(token_id) == 2 * amount


def test_beneficiary_returns_current_recipient(
    funded_game, pasanaku_contract, protocol_fee
):
    token_id = funded_game["token_id"]
    players = funded_game["players"]
    assert pasanaku_contract.beneficiary(token_id) == players[0]
    with boa.env.prank(players[1]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    with boa.env.prank(players[2]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    with boa.env.prank(players[0]):
        pasanaku_contract.claim(token_id, value=protocol_fee)
    assert pasanaku_contract.beneficiary(token_id) == players[1]


def test_can_recover_follows_implementation(
    funded_game, pasanaku_contract, protocol_fee
):
    token_id = funded_game["token_id"]
    players = funded_game["players"]
    assert pasanaku_contract.can_recover(players[1], token_id) is False
    with boa.env.prank(players[1]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    assert pasanaku_contract.can_recover(players[1], token_id) is False
    boa.env.time_travel(seconds=DAYS_30)
    assert pasanaku_contract.can_recover(players[1], token_id) is True


def test_can_claim_follows_implementation(funded_game, pasanaku_contract, protocol_fee):
    token_id = funded_game["token_id"]
    players = funded_game["players"]
    # Beneficiary cannot claim until all have deposited
    assert pasanaku_contract.can_claim(players[0], token_id) is False


def test_participants_count_returns_actual_count(created_game, pasanaku_contract):
    assert pasanaku_contract.participants_count(created_game["token_id"]) == 3


def test_protocol_fee_returns_constant(pasanaku_contract):
    assert pasanaku_contract.protocol_fee() == 0


def test_supported_assets_returns_deployed_list(pasanaku_contract, supported_assets):
    returned = pasanaku_contract.supported_assets()
    assert len(returned) == 3
    for asset in supported_assets:
        assert asset.address in returned


# --- Full flow ---


def test_full_round_one_claim(funded_game, pasanaku_contract, protocol_fee):
    token_id = funded_game["token_id"]
    asset = funded_game["asset"]
    players = funded_game["players"]
    amount = funded_game["amount"]
    with boa.env.prank(players[1]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    with boa.env.prank(players[2]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    balance_before = asset.balanceOf(players[0])
    with boa.env.prank(players[0]):
        pasanaku_contract.claim(token_id, value=protocol_fee)
    assert get_rotating_savings(pasanaku_contract, token_id).current_index == 1
    assert pasanaku_contract.total_deposited(token_id) == 0
    assert asset.balanceOf(players[0]) == balance_before + amount * 2


def test_full_game_until_ended(
    pasanaku_contract, deployer, test_accounts, protocol_fee, supported_assets
):
    # 3 players: game ends after 3 rounds (current_index becomes 3, ended=True)
    asset = supported_assets[0]
    players = test_accounts[:3]
    amount = 100 * 10**6
    with boa.env.prank(deployer):
        pasanaku_contract.create(asset.address, players, amount, value=protocol_fee)
    for p in players:
        with boa.env.prank(asset.owner()):
            asset.faucet(p, amount * 10)
        with boa.env.prank(p):
            asset.approve(pasanaku_contract.address, amount * 10)
    token_id = 0
    for round_index in range(3):
        recipient = players[round_index]
        others = [p for p in players if p != recipient]
        for p in others:
            with boa.env.prank(p):
                pasanaku_contract.deposit(token_id, value=protocol_fee)
        balance_before = asset.balanceOf(recipient)
        with boa.env.prank(recipient):
            pasanaku_contract.claim(token_id, value=protocol_fee)
        assert asset.balanceOf(recipient) == balance_before + amount * 2
    rs = get_rotating_savings(pasanaku_contract, token_id)
    assert rs.ended is True
    assert rs.current_index == 3


# --- New scenario tests ---


def test_game_two_participants(
    pasanaku_contract, deployer, test_accounts, protocol_fee, supported_assets
):
    """Full game with exactly 2 participants: two rounds then game ends."""
    asset = supported_assets[0]
    players = test_accounts[:2]
    amount = 100 * 10**6
    with boa.env.prank(deployer):
        pasanaku_contract.create(asset.address, players, amount, value=protocol_fee)
    for p in players:
        with boa.env.prank(asset.owner()):
            asset.faucet(p, amount * 5)
        with boa.env.prank(p):
            asset.approve(pasanaku_contract.address, amount * 5)
    token_id = 0
    assert pasanaku_contract.participants_count(token_id) == 2
    assert pasanaku_contract.beneficiary(token_id) == players[0]
    # Round 0: p1 deposits, p0 claims
    with boa.env.prank(players[1]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    balance_before = asset.balanceOf(players[0])
    with boa.env.prank(players[0]):
        pasanaku_contract.claim(token_id, value=protocol_fee)
    assert asset.balanceOf(players[0]) == balance_before + amount
    # Round 1: p0 deposits, p1 claims -> game ends
    with boa.env.prank(players[0]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    balance_before_p1 = asset.balanceOf(players[1])
    with boa.env.prank(players[1]):
        pasanaku_contract.claim(token_id, value=protocol_fee)
    rs = get_rotating_savings(pasanaku_contract, token_id)
    assert rs.ended is True
    assert asset.balanceOf(players[1]) == balance_before_p1 + amount
    assert not pasanaku_contract.can_claim(players[0], token_id)


def test_game_ten_participants_five_same_address(
    pasanaku_contract, deployer, test_accounts, protocol_fee, supported_assets
):
    """Game with 10 participant slots where 5 slots are the same address.
    Deposit is tracked per (address, token_id, index), so addr_a can only deposit
    once per round; we need min 5*amount for addr_a to claim (10-5 slots)."""
    asset = supported_assets[0]
    addr_a = test_accounts[0]
    others = list(test_accounts[5:10])
    participants = [addr_a] * 5 + others
    amount = 100 * 10**6
    with boa.env.prank(deployer):
        pasanaku_contract.create(
            asset.address, participants, amount, value=protocol_fee
        )
    with boa.env.prank(asset.owner()):
        asset.faucet(addr_a, amount * 50)
    with boa.env.prank(addr_a):
        asset.approve(pasanaku_contract.address, amount * 50)
    for p in others:
        with boa.env.prank(asset.owner()):
            asset.faucet(p, amount * 10)
        with boa.env.prank(p):
            asset.approve(pasanaku_contract.address, amount * 10)
    token_id = 0
    assert pasanaku_contract.participants_count(token_id) == 10
    assert pasanaku_contract.beneficiary(token_id) == addr_a
    # Round 0: addr_a is beneficiary so cannot deposit; only the 5 other addresses deposit
    # min_amount_to_claim for addr_a = amount * (10 - 5) = 5*amount, so 5 deposits suffice
    for p in others:
        with boa.env.prank(p):
            pasanaku_contract.deposit(token_id, value=protocol_fee)
    assert pasanaku_contract.total_deposited(token_id) == 5 * amount
    balance_before = asset.balanceOf(addr_a)
    with boa.env.prank(addr_a):
        pasanaku_contract.claim(token_id, value=protocol_fee)
    assert pasanaku_contract.total_deposited(token_id) == 0
    assert get_rotating_savings(pasanaku_contract, token_id).current_index == 1
    assert asset.balanceOf(addr_a) == balance_before + 5 * amount


def test_game_ten_participants_stale_recovery(
    pasanaku_contract, deployer, test_accounts, protocol_fee, supported_assets
):
    """Game of 10 participants: all non-beneficiaries deposit, then 30 days pass and one recovers."""
    asset = supported_assets[0]
    players = test_accounts[:10]
    amount = 100 * 10**6
    with boa.env.prank(deployer):
        pasanaku_contract.create(asset.address, players, amount, value=protocol_fee)
    for p in players:
        with boa.env.prank(asset.owner()):
            asset.faucet(p, amount * 20)
        with boa.env.prank(p):
            asset.approve(pasanaku_contract.address, amount * 20)
    token_id = 0
    # Round 0: beneficiary is players[0]; players[1]..[9] deposit
    for i in range(1, 10):
        with boa.env.prank(players[i]):
            pasanaku_contract.deposit(token_id, value=protocol_fee)
    assert pasanaku_contract.total_deposited(token_id) == 9 * amount
    boa.env.time_travel(seconds=DAYS_30)
    depositor = players[1]
    balance_before = asset.balanceOf(depositor)
    token_balance_before = pasanaku_contract.balanceOf(depositor, token_id)
    with boa.env.prank(depositor):
        pasanaku_contract.recover(token_id)
    assert pasanaku_contract.balanceOf(depositor, token_id) == token_balance_before - 1
    assert asset.balanceOf(depositor) == balance_before + amount
    assert pasanaku_contract.total_deposited(token_id) == 8 * amount
    assert get_rotating_savings(pasanaku_contract, token_id).recovered is True
    # After recovery, deposit and claim are disabled
    assert not pasanaku_contract.can_claim(players[0], token_id)
    assert not pasanaku_contract.can_deposit(players[2], token_id)
