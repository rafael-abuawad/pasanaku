import { formatUnits } from "viem";
import {
	getRotatingSavings,
	type RotatingSavingsResult,
} from "@/lib/viem-server";
import { getDecimals, getSymbol } from "@/lib/supported-assets";
import type { Address } from "viem";

const DAYS_30 = 60 * 60 * 24 * 30;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

const numberFormat = Intl.NumberFormat("en-US", {
	minimumFractionDigits: 0,
	maximumFractionDigits: 6,
});

function formatTokenAmount(amount: bigint, decimals: number): string {
	return numberFormat.format(Number(formatUnits(amount, decimals)));
}

function parseTokenId(value: string | null): bigint | null {
	if (value === null || value === "") return null;
	const n = Number(value);
	if (Number.isNaN(n) || n < 0 || !Number.isInteger(n)) return null;
	return BigInt(value);
}

function isEmptyGame(rs: RotatingSavingsResult): boolean {
	return (
		rs.player_count === BigInt(0) ||
		rs.players.length === 0 ||
		(rs.asset as string).toLowerCase() === ZERO_ADDRESS
	);
}

type Status = "Active" | "Ended" | "Stale";

function getStatus(rs: RotatingSavingsResult): Status {
	if (rs.ended) return "Ended";
	const now = Math.floor(Date.now() / 1000);
	if (now - Number(rs.last_updated_at) >= DAYS_30) return "Stale";
	return "Active";
}

/**
 * ERC1155-style token metadata. The token URI (e.g. contract uri(tokenId)) should
 * point to this route. The `image` field contains the absolute URL to the dynamic PNG.
 */
export async function GET(
	request: Request,
	context: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await context.params;
		const tokenId = parseTokenId(id ?? null);
		if (tokenId === null) {
			return new Response(
				JSON.stringify({ error: "Invalid or missing token id" }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		const rs = await getRotatingSavings(tokenId);
		if (!rs || isEmptyGame(rs)) {
			return new Response(JSON.stringify({ error: "Game not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		const decimals = getDecimals(rs.asset as Address);
		const symbol = getSymbol(rs.asset as Address);
		const status = getStatus(rs);
		const formattedAmount = formatTokenAmount(rs.amount, decimals);
		const formattedPot = formatTokenAmount(rs.total_deposited, decimals);
		const roundCurrent = Number(rs.current_index) + 1;
		const roundTotal = Number(rs.player_count);

		const url = new URL(request.url);
		const origin = url.origin;
		const imageUrl = `${origin}/api/v1/token/${id}/image`;

		const name = `Pasanaku #${String(rs.token_id)}`;
		const description = [
			`Rotating savings game. ${formattedAmount} ${symbol} per round.`,
			`${roundTotal} players, round ${roundCurrent} of ${roundTotal}.`,
			`Pot: ${formattedPot} ${symbol}. Status: ${status}.`,
		].join(" ");

		const metadata = {
			name,
			description,
			image: imageUrl,
			attributes: [
				{ trait_type: "Token ID", value: String(rs.token_id) },
				{ trait_type: "Asset", value: symbol },
				{ trait_type: "Amount", value: formattedAmount },
				{ trait_type: "Players", value: Number(rs.player_count) },
				{ trait_type: "Round", value: `${roundCurrent} of ${roundTotal}` },
				{ trait_type: "Pot", value: `${formattedPot} ${symbol}` },
				{ trait_type: "Status", value: status },
				{ trait_type: "Creator", value: rs.creator as string },
			],
		};

		return new Response(JSON.stringify(metadata), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "public, max-age=60, s-maxage=60",
			},
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : "Unknown error";
		console.error("[token metadata route]", message);
		return new Response(JSON.stringify({ error: "Failed to load metadata" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}
