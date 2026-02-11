"use client";

import Link from "next/link";
import { formatUnits } from "viem";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getDecimals, getSymbol } from "@/lib/supported-assets";
import type { Address } from "viem";

export type RotatingSavings = {
	players: readonly `0x${string}`[];
	asset: `0x${string}`;
	amount: bigint;
	player_count: bigint;
	current_player_index: bigint;
	creator: `0x${string}`;
	total_deposited: bigint;
	token_id: bigint;
	ended: boolean;
	created_at: bigint;
	last_updated_at: bigint;
};

type OngoingGameCardProps = {
	tokenId: bigint;
	rs: RotatingSavings;
};

const numberFormat = Intl.NumberFormat("en-US", {
	minimumFractionDigits: 0,
	maximumFractionDigits: 6,
});

function formatTokenAmount(amount: bigint, decimals: number): string {
	return numberFormat.format(Number(formatUnits(amount, decimals)));
}

export function OngoingGameCard({ tokenId, rs }: OngoingGameCardProps) {
	const decimals = getDecimals(rs.asset as Address);
	const symbol = getSymbol(rs.asset as Address);
	const expectedTotal = rs.amount * BigInt(Number(rs.player_count) - 1);

	const formattedAmount = formatTokenAmount(rs.amount, decimals);
	const formattedDeposited = formatTokenAmount(rs.total_deposited, decimals);
	const formattedExpectedTotal = formatTokenAmount(expectedTotal, decimals);

	return (
		<li>
			<Link href={`/game/${tokenId}`}>
				<Card className="transition-colors hover:bg-muted/50">
					<CardHeader className="pb-2">
						<span className="text-foreground font-medium">
							Game #{String(tokenId)}
						</span>
						<span className="text-muted-foreground text-sm">
							{symbol} · {formattedAmount} per round · {Number(rs.player_count)}{" "}
							players
						</span>
					</CardHeader>
					<CardContent className="pt-0">
						<p className="text-muted-foreground text-xs">
							Deposited: {formattedDeposited} / {formattedExpectedTotal} · Round{" "}
							{Number(rs.current_player_index) + 1} of {Number(rs.player_count)}
							{rs.ended ? " · Ended" : ""}
						</p>
					</CardContent>
				</Card>
			</Link>
		</li>
	);
}
