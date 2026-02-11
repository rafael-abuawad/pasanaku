"use client";

import Link from "next/link";
import { useReadContracts } from "wagmi";
import { pasanakuAbi } from "@/lib/abi";
import { useSupportedAssets } from "@/hooks/use-supported-assets";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PASANAKU_ADDRESS } from "@/lib/contract";

type RotatingSavings = {
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

type OngoingGamesListProps = {
	tokenIds: bigint[];
	isLoading: boolean;
};

export function OngoingGamesList({
	tokenIds,
	isLoading,
}: OngoingGamesListProps) {
	const { getSymbol } = useSupportedAssets();
	const contracts = tokenIds.map((id) => ({
		address: PASANAKU_ADDRESS,
		abi: pasanakuAbi,
		functionName: "rotating_savings" as const,
		args: [id] as const,
	}));

	const { data: results, isLoading: isLoadingRs } = useReadContracts({
		contracts,
	});

	if (isLoading || isLoadingRs) {
		return (
			<main className="mx-auto max-w-3xl px-4 py-8">
				<p className="text-muted-foreground text-sm">Loading games…</p>
			</main>
		);
	}

	const games = (results ?? [])
		.map((r, i) =>
			r.status === "success" && r.result
				? { tokenId: tokenIds[i], rs: r.result as RotatingSavings }
				: null,
		)
		.filter((g): g is { tokenId: bigint; rs: RotatingSavings } => g != null);

	return (
		<main className="mx-auto max-w-3xl px-4 py-8">
			<h2 className="text-foreground mb-4 text-lg font-semibold">
				Your rotating savings
			</h2>
			<ul className="flex flex-col gap-3">
				{games.map(({ tokenId, rs }) => {
					const expectedTotal = rs.amount * BigInt(Number(rs.player_count) - 1);
					const symbol = getSymbol(rs.asset);
					return (
						<li key={String(tokenId)}>
							<Link href={`/game/${tokenId}`}>
								<Card className="transition-colors hover:bg-muted/50">
									<CardHeader className="pb-2">
										<span className="text-foreground font-medium">
											Game #{String(tokenId)}
										</span>
										<span className="text-muted-foreground text-sm">
											{symbol} · {rs.amount.toString()} per round ·{" "}
											{Number(rs.player_count)} players
										</span>
									</CardHeader>
									<CardContent className="pt-0">
										<p className="text-muted-foreground text-xs">
											Deposited: {rs.total_deposited.toString()} /{" "}
											{expectedTotal.toString()} · Round{" "}
											{Number(rs.current_player_index) + 1} of{" "}
											{Number(rs.player_count)}
											{rs.ended ? " · Ended" : ""}
										</p>
									</CardContent>
								</Card>
							</Link>
						</li>
					);
				})}
			</ul>
		</main>
	);
}
