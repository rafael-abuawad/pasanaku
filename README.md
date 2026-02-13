# Pasanaku

A **rotating savings protocol** onchain. Create a “game,” add up to 12 players, and take turns receiving the pot each round. No new money is created—participants simply rotate who gets the pooled savings.

## What is rotating savings?

In a rotating savings group, everyone commits to the same contribution (e.g. 100 USDC) each round. Each round, one person receives the full pot (everyone else’s contributions). Next round, the next person receives, and so on until everyone has received once. You’re not earning yield; you’re taking turns getting a lump sum made of the group’s savings.

## How it works

1. **Create a game**  
   You define:
   - **Asset** (e.g. USDC)
   - **Contribution amount** per round (e.g. 100 USDC)
   - **Players** (up to 12 addresses; the same address can appear more than once)

2. **Rounds (monthly)**  
   Each round is intended to be **monthly**. In a round:
   - The **current recipient** does not pay; they are the one who will receive the pot.
   - All **other players** deposit the contribution amount for that round.
   - Once everyone else has deposited, the **current recipient claims** the full pot.
   - The next round starts with the next player as recipient, and so on.

3. **Example**  
   - 100 USDC per round, 10 players.  
   - Each month one player receives **1,000 USDC** (100 × 9 from the other players; plus the 100 they didn't put that month).  
   - Over 10 months, each player pays 100 USDC in 9 months and receives 1,000 USDC in 1 month. Net: same as saving 100 USDC per month and getting a 1,000 USDC payout once—no extra money, just rotation.

## Trust model

Pasanaku **only works with trusted participants**. The contract cannot force someone to pay in future rounds. If a participant stops paying after they’ve already received their round, the others lose that contribution. Play only with people you trust to honor the full schedule (e.g. all remaining months).

## Protocol overview

- **Create** a rotating savings game with an ERC‑20 asset, contribution amount, and player list (≤12).
- **Deposit**: each round, every player except the current recipient deposits the fixed amount; the contract tracks who has paid.
- **Claim**: when all other players have deposited, the current recipient claims the pot; the game advances to the next recipient.
- **Recover**: if the game gets stuck (e.g. current recipient never claims), after a wait period participants can recover their own deposited amount for that round.

Supported assets and protocol fees are defined in the contract (see `Pasanaku.vy`).

## Development

- **Language / chain**: Vyper smart contract (EVM).
- **Tests**: `pytest` (see `tests/`).
- **Scripts**: deployment and helpers in `script/`.

## Deployemns
- **Mock tokens**
   - USDC: 0xd24Eab8A12c6d42d4614493Eb2F3F9aD34b1CF5F
   - USDT0: 0xE0FB0F453aBfbd74368074cf0291711FC82cBc07
   - WETH: 0x1c97C5715F20445400716DB9b1EA2e82F873cF35
- **Pasanaku** (Verified smartcontract)
   - [0x530a4cBdC461181519E5459309411710e8C23EE6](https://arbitrum.blockscout.com/address/0x530a4cBdC461181519E5459309411710e8C23EE6?tab=contract_code)

### TODOs

- Make protocol fee dynamic (e.g. 0.10 USD in ETH).
- Set supported tokens as constants (USDC, USDT, WETH, DAI, crvUSD, etc. as in contract).

## License

MIT (see [LICENSE](LICENSE)).
