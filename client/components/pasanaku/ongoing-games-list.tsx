"use client";

import { useReadContracts } from "wagmi";
import { pasanakuAbi } from "@/lib/abi";
import { PASANAKU_ADDRESS } from "@/lib/contract";
import type { RotatingSavings } from "@/components/pasanaku/ongoing-game-card";
import { OngoingGameCard } from "@/components/pasanaku/ongoing-game-card";
import { Spinner } from "../ui/spinner";

type OngoingGamesListProps = {
	tokenIds: bigint[];
	isLoading: boolean;
};

export function OngoingGamesList({
	tokenIds,
	isLoading,
}: OngoingGamesListProps) {
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
			<main className="mx-auto max-w-4xl container px-4 py-8 md:px-0">
				<div className="flex items-center justify-center gap-2">
					<Spinner />
					<p className="text-muted-foreground text-sm">Loading games…</p>
				</div>
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
		<main className="mx-auto max-w-4xl container px-4 py-8 md:px-0">
			<h2 className="text-foreground mb-6 text-lg font-semibold">
				Your rotating savings
			</h2>
			<ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{games.map(({ tokenId, rs }) => (
					<OngoingGameCard key={String(tokenId)} tokenId={tokenId} rs={rs} />
				))}
			</ul>
		</main>
	);
}
