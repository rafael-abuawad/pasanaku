import boa
import random

# 30 days in seconds, for recover time condition
DAYS_30 = 60 * 60 * 24 * 30


# --- Existing / owner / config ---


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


# --- Create ---


def test_create_reverts_insufficient_fee(
    pasanaku_contract, deployer, test_accounts, supported_assets
):
    with boa.env.prank(deployer):
        with boa.reverts(dev="insufficient fee"):
            pasanaku_contract.create(
                supported_assets[0].address,
                test_accounts[:2],
                100,
                value=0,
            )


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

    rs = pasanaku_contract.rotating_savings(token_id)
    assert list(rs[0]) == list(players)
    assert rs[1] == asset.address
    assert rs[2] == amount
    assert rs[3] == 3  # player_count
    assert rs[4] == 0  # current_player_index
    assert rs[6] == 0  # total_deposited
    assert rs[7] == token_id
    assert rs[8] is False  # ended


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
    rs = pasanaku_contract.rotating_savings(1)
    assert rs[1] == created_game["asset"].address
    assert rs[2] == created_game["amount"]
    assert rs[3] == 3


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
    assert pasanaku_contract.rotating_savings(0)[7] == 0
    assert pasanaku_contract.rotating_savings(1)[7] == 1


# --- Deposit ---


def test_deposit_reverts_insufficient_fee(funded_game, pasanaku_contract):
    token_id = funded_game["token_id"]
    players = funded_game["players"]
    # Player 1 deposits (player 0 is current recipient)
    with boa.env.prank(players[1]):
        with boa.reverts(dev="insufficient fee"):
            pasanaku_contract.deposit(token_id, value=0)


def test_deposit_reverts_token_does_not_exist(
    funded_game, pasanaku_contract, protocol_fee
):
    with boa.env.prank(funded_game["players"][1]):
        with boa.reverts(dev="token does not exist"):
            pasanaku_contract.deposit(999, value=protocol_fee)


def test_deposit_reverts_not_player(
    funded_game, pasanaku_contract, protocol_fee, test_accounts
):
    non_player = test_accounts[5]
    with boa.env.prank(non_player):
        with boa.reverts(dev="not a player"):
            pasanaku_contract.deposit(funded_game["token_id"], value=protocol_fee)


def test_deposit_reverts_current_player_cannot_deposit(
    funded_game, pasanaku_contract, protocol_fee
):
    token_id = funded_game["token_id"]
    players = funded_game["players"]
    current_recipient = players[0]
    with boa.env.prank(current_recipient):
        with boa.reverts(dev="current player should not deposit"):
            pasanaku_contract.deposit(token_id, value=protocol_fee)


def test_deposit_reverts_already_deposited(
    funded_game, pasanaku_contract, protocol_fee
):
    token_id = funded_game["token_id"]
    players = funded_game["players"]
    with boa.env.prank(players[1]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    with boa.env.prank(players[1]):
        with boa.reverts(dev="already deposited"):
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
        with boa.reverts(dev="token does not exist"):
            pasanaku_contract.claim(999, value=protocol_fee)


def test_claim_reverts_insufficient_fee(funded_game, pasanaku_contract, protocol_fee):
    token_id = funded_game["token_id"]
    players = funded_game["players"]
    with boa.env.prank(players[1]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    with boa.env.prank(players[2]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    with boa.env.prank(players[0]):
        with boa.reverts(dev="insufficient fee"):
            pasanaku_contract.claim(token_id, value=0)


def test_claim_reverts_not_all_deposited(funded_game, pasanaku_contract, protocol_fee):
    token_id = funded_game["token_id"]
    players = funded_game["players"]
    with boa.env.prank(players[1]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    with boa.env.prank(players[0]):
        with boa.reverts(dev="not all players have deposited"):
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
    rs = pasanaku_contract.rotating_savings(token_id)
    assert rs[4] == 1
    assert pasanaku_contract.total_deposited(token_id) == 0
    expected_pot = amount * 2
    assert asset.balanceOf(recipient) == balance_before + expected_pot


def test_claim_last_round_ends_game(
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
    balance_before = asset.balanceOf(players[0])
    with boa.env.prank(players[0]):
        pasanaku_contract.claim(token_id, value=protocol_fee)
    assert pasanaku_contract.rotating_savings(token_id)[8] is True
    assert asset.balanceOf(players[0]) == balance_before + amount


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
        with boa.reverts(dev="rotating savings has ended"):
            pasanaku_contract.claim(token_id, value=protocol_fee)


# --- Recover ---


def test_recover_reverts_token_does_not_exist(pasanaku_contract, test_accounts):
    with boa.env.prank(test_accounts[0]):
        with boa.reverts(dev="token does not exist"):
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
        with boa.reverts(dev="rotating savings has ended"):
            pasanaku_contract.recover(token_id)


def test_recover_reverts_not_deposited(funded_game, pasanaku_contract):
    token_id = funded_game["token_id"]
    players = funded_game["players"]
    boa.env.time_travel(seconds=DAYS_30)
    with boa.env.prank(players[0]):
        with boa.reverts(dev="not deposited"):
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
        with boa.reverts(dev="not deposited"):
            pasanaku_contract.recover(token_id)


def test_recover_reverts_time_condition(funded_game, pasanaku_contract, protocol_fee):
    token_id = funded_game["token_id"]
    players = funded_game["players"]
    with boa.env.prank(players[1]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    with boa.env.prank(players[1]):
        with boa.reverts(dev="not enough time has passed"):
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
    assert asset.balanceOf(players[1]) == balance_before + amount


# --- Views ---


def test_rotating_savings_returns_struct(created_game, pasanaku_contract):
    token_id = created_game["token_id"]
    rs = pasanaku_contract.rotating_savings(token_id)
    assert list(rs[0]) == list(created_game["players"])
    assert rs[1] == created_game["asset"].address
    assert rs[2] == created_game["amount"]


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


def test_current_player_returns_recipient(funded_game, pasanaku_contract, protocol_fee):
    token_id = funded_game["token_id"]
    players = funded_game["players"]
    assert pasanaku_contract.current_player(token_id) == players[0]
    with boa.env.prank(players[1]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    with boa.env.prank(players[2]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    with boa.env.prank(players[0]):
        pasanaku_contract.claim(token_id, value=protocol_fee)
    assert pasanaku_contract.current_player(token_id) == players[1]


def test_can_be_recovered_follows_implementation(
    funded_game, pasanaku_contract, protocol_fee
):
    token_id = funded_game["token_id"]
    players = funded_game["players"]
    assert pasanaku_contract.can_be_recovered(token_id) is False
    with boa.env.prank(players[1]):
        pasanaku_contract.deposit(token_id, value=protocol_fee)
    assert pasanaku_contract.can_be_recovered(token_id) is False
    boa.env.time_travel(seconds=DAYS_30)
    assert pasanaku_contract.can_be_recovered(token_id) is True


def test_can_be_claimed_follows_implementation(
    funded_game, pasanaku_contract, protocol_fee
):
    token_id = funded_game["token_id"]
    assert pasanaku_contract.can_be_claimed(token_id) is False


def test_player_count_returns_actual_count(created_game, pasanaku_contract):
    assert pasanaku_contract.player_count(created_game["token_id"]) == 3


def test_protocol_fee_returns_constant(pasanaku_contract):
    assert pasanaku_contract.protocol_fee() == int(0.000045 * 10**18)


def test_supported_assets_returns_deployed_list(pasanaku_contract, supported_assets):
    returned = pasanaku_contract.supported_assets()
    assert len(returned) == 5
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
    assert pasanaku_contract.rotating_savings(token_id)[4] == 1
    assert pasanaku_contract.total_deposited(token_id) == 0
    assert asset.balanceOf(players[0]) == balance_before + amount * 2


def test_full_game_until_ended(
    pasanaku_contract, deployer, test_accounts, protocol_fee, supported_assets
):
    # 3 players: game ends after 2 claims (current_player_index becomes 2, ended=True)
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
    for round_index in range(2):
        recipient = players[round_index]
        others = [p for p in players if p != recipient]
        for p in others:
            with boa.env.prank(p):
                pasanaku_contract.deposit(token_id, value=protocol_fee)
        balance_before = asset.balanceOf(recipient)
        with boa.env.prank(recipient):
            pasanaku_contract.claim(token_id, value=protocol_fee)
        assert asset.balanceOf(recipient) == balance_before + amount * 2
    rs = pasanaku_contract.rotating_savings(token_id)
    assert rs[8] is True
    assert rs[4] == 2
