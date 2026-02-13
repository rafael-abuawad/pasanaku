import { createPublicClient, http } from "viem";
import { arbitrum } from "viem/chains";
import { pasanakuAbi } from "@/lib/abi";
import { PASANAKU_ADDRESS } from "@/lib/contract";

const RPC_URL = "https://arb1.arbitrum.io/rpc";

export const publicClient = createPublicClient({
	chain: arbitrum,
	transport: http(RPC_URL),
});

/**
 * Raw tuple returned by the contract rotating_savings(token_id) view.
 */
type RotatingSavingsRaw = {
	participants: readonly `0x${string}`[];
	asset: `0x${string}`;
	amount: bigint;
	current_index: bigint;
	total_deposited: bigint;
	token_id: bigint;
	ended: boolean;
	recovered: boolean;
	creator: `0x${string}`;
	created_at: bigint;
	last_updated_at: bigint;
};

/**
 * Normalized shape with players and player_count for consumers that expect them.
 */
export type RotatingSavingsResult = RotatingSavingsRaw & {
	players: readonly `0x${string}`[];
	player_count: bigint;
};

/**
 * Fetches rotating_savings game data for a token ID from the Pasanaku contract on Arbitrum.
 * Returns a normalized result with players and player_count. Throws if the game does not exist or the RPC call fails.
 */
export async function getRotatingSavings(
	tokenId: bigint,
): Promise<RotatingSavingsResult> {
	const raw = await publicClient.readContract({
		address: PASANAKU_ADDRESS,
		abi: pasanakuAbi,
		functionName: "rotating_savings",
		args: [tokenId],
	});
	const result = raw as RotatingSavingsRaw;
	return {
		...result,
		players: result.participants,
		player_count: BigInt(result.participants.length),
	};
}
