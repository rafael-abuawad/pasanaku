"use client";

import { formatUnits } from "viem";
import { useReadContract } from "wagmi";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { pasanakuAbi } from "@/lib/abi";
import { PASANAKU_ADDRESS } from "@/lib/contract";
import { getDecimals } from "@/lib/supported-assets";
import type { RotatingSavings } from "./ongoing-game-card";
import { TokenDisplay } from "./token-display";
import { DepositClaimActions } from "./deposit-claim-actions";
import { DepositsTable } from "./deposits-table";
import type { Address } from "viem";

const numberFormat = Intl.NumberFormat("en-US", {
	minimumFractionDigits: 0,
	maximumFractionDigits: 6,
});

function formatTokenAmount(amount: bigint, decimals: number): string {
	return numberFormat.format(Number(formatUnits(amount, decimals)));
}

type GameDetailsViewProps = {
	tokenId: bigint;
	rs: RotatingSavings;
	onRefetch?: () => void;
};

export function GameDetailsView({
	tokenId,
	rs,
	onRefetch,
}: GameDetailsViewProps) {
	const { data: protocolFee } = useReadContract({
		address: PASANAKU_ADDRESS,
		abi: pasanakuAbi,
		functionName: "protocol_fee",
	});

	const decimals = getDecimals(rs.asset as Address);
	const expectedTotal = rs.amount * BigInt(Number(rs.player_count) - 1);
	const formattedAmount = formatTokenAmount(rs.amount, decimals);
	const formattedDeposited = formatTokenAmount(rs.total_deposited, decimals);
	const formattedExpectedTotal = formatTokenAmount(expectedTotal, decimals);
	const percentage =
		expectedTotal > BigInt(0)
			? Math.min(
					100,
					Number((BigInt(rs.total_deposited) * BigInt(100)) / expectedTotal),
				)
			: 0;

	return (
		<div className="mx-auto max-w-4xl container px-4 py-8 md:px-0 space-y-6">
			{/* Header */}
			<header className="space-y-1 border-b pb-4">
				<h1 className="text-foreground text-xl font-semibold">
					Game #{String(tokenId)}
				</h1>
				<p className="text-muted-foreground text-sm">
					<TokenDisplay address={rs.asset as Address} /> · {formattedAmount} per
					round · {Number(rs.player_count)} players
				</p>
			</header>

			{/* Round details */}
			<Card>
				<CardHeader>
					<span className="text-foreground font-medium">Round details</span>
					<span className="text-muted-foreground text-sm">
						Round {Number(rs.current_player_index) + 1} of{" "}
						{Number(rs.player_count)}
						{rs.ended ? " · Ended" : ""}
					</span>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Deposited</span>
							<span className="font-medium tabular-nums">
								{formattedDeposited} / {formattedExpectedTotal}
							</span>
						</div>
						<div
							className="bg-muted h-2 w-full overflow-hidden rounded-full"
							role="progressbar"
							aria-valuenow={percentage}
							aria-valuemin={0}
							aria-valuemax={100}
						>
							<div
								className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
								style={{ width: `${percentage}%` }}
							/>
						</div>
					</div>
					<DepositClaimActions
						tokenId={tokenId}
						rs={rs}
						protocolFee={protocolFee}
						onSuccess={onRefetch}
					/>
				</CardContent>
			</Card>

			{/* Deposits table */}
			<DepositsTable
				tokenId={tokenId}
				currentRoundIndex={rs.current_player_index}
				players={rs.players}
			/>
		</div>
	);
}
