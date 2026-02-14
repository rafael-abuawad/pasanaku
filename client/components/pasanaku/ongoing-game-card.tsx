"use client";

import Link from "next/link";
import { formatUnits } from "viem";
import { Card, CardContent } from "@/components/ui/card";
import { getDecimals, getSymbol } from "@/lib/supported-assets";
import type { Address } from "viem";

export type RotatingSavings = {
	players: readonly `0x${string}`[];
	asset: `0x${string}`;
	amount: bigint;
	player_count: bigint;
	current_index: bigint;
	creator: `0x${string}`;
	total_deposited: bigint;
	token_id: bigint;
	ended: boolean;
	recovered?: boolean;
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
	const formattedAmount = formatTokenAmount(rs.amount, decimals);
	const roundLabel = `${Number(rs.current_index) + 1}/${Number(rs.player_count)}`;

	return (
		<li className="list-none">
			<Link href={`/game/${tokenId}`} className="block h-full">
				<Card className="overflow-hidden transition-all hover:shadow-lg hover:ring-2 hover:ring-primary/20 h-full flex flex-col pt-0">
					{/* Dynamic token image from API */}
					<div className="relative w-full aspect-[315/600] bg-muted shrink-0">
						<img
							src={`/api/v1/token/${tokenId}/image`}
							alt={`Pasanaku game #${String(tokenId)}`}
							className="w-full h-full object-cover object-center"
							width={315}
							height={600}
						/>
					</div>
					<CardContent className="p-3 flex flex-col gap-1 shrink-0">
						<div className="flex items-center justify-between gap-2">
							<span className="text-sm font-medium truncate">
								Game #{String(tokenId)}
							</span>
							<span className="text-muted-foreground text-xs shrink-0">
								{formattedAmount} {symbol} · {roundLabel}
							</span>
						</div>
						{rs.ended && (
							<span className="text-xs text-amber-600 dark:text-amber-400">
								Ended
							</span>
						)}
					</CardContent>
				</Card>
			</Link>
		</li>
	);
}
