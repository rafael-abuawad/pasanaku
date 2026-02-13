import { createPublicClient, http } from "viem";
import { arbitrum } from "viem/chains";
import { pasanakuAbi } from "@/lib/abi";
import { PASANAKU_ADDRESS } from "@/lib/contract";

const RPC_URL = "https://arb1.arbitrum.io/rpc";

export const publicClient = createPublicClient({
	chain: arbitrum,
	transport: http(RPC_URL),
});

export type RotatingSavingsResult = Awaited<
	ReturnType<typeof getRotatingSavings>
>;

/**
 * Fetches rotating_savings game data for a token ID from the Pasanaku contract on Arbitrum.
 * Throws if the game does not exist or the RPC call fails.
 */
export async function getRotatingSavings(tokenId: bigint) {
	return publicClient.readContract({
		address: PASANAKU_ADDRESS,
		abi: pasanakuAbi,
		functionName: "rotating_savings",
		args: [tokenId],
	});
}
