"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useReadContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { pasanakuAbi } from "@/lib/abi";
import { PASANAKU_ADDRESS } from "@/lib/contract";
import { GameDetailsView } from "@/components/pasanaku/game-details-view";
import type { RotatingSavings } from "@/components/pasanaku/ongoing-game-card";

function parseTokenId(value: string | undefined): bigint | null {
	if (value === undefined || value === "") return null;
	const n = Number(value);
	if (Number.isNaN(n) || n < 0 || !Number.isInteger(n)) return null;
	return BigInt(value);
}

function isEmptyGame(rs: RotatingSavings): boolean {
	return (
		rs.player_count === BigInt(0) ||
		rs.players.length === 0 ||
		rs.asset === "0x0000000000000000000000000000000000000000"
	);
}

/** Maps raw rotating_savings tuple to normalized shape with players and player_count. */
function normalizeRotatingSavings(raw: {
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
}): RotatingSavings {
	return {
		...raw,
		players: raw.participants,
		player_count: BigInt(raw.participants.length),
	};
}

export default function GamePage() {
	const params = useParams();
	const tokenIdParam = params?.tokenId as string | undefined;
	const tokenId = parseTokenId(tokenIdParam);

	const { data: nextTokenId, isLoading: isLoadingNextId } = useReadContract({
		address: PASANAKU_ADDRESS,
		abi: pasanakuAbi,
		functionName: "next_token_id",
	});

	const {
		data: rs,
		isLoading: isLoadingRs,
		refetch,
	} = useReadContract({
		address: PASANAKU_ADDRESS,
		abi: pasanakuAbi,
		functionName: "rotating_savings",
		args: tokenId !== null ? [tokenId] : undefined,
	});

	const normalizedRs =
		rs != null
			? normalizeRotatingSavings(
					rs as Parameters<typeof normalizeRotatingSavings>[0],
				)
			: undefined;

	const isLoading = isLoadingNextId || (tokenId !== null && isLoadingRs);
	const outOfRange =
		tokenId !== null && nextTokenId !== undefined && tokenId >= nextTokenId;
	const notFound =
		tokenId === null ||
		outOfRange ||
		(normalizedRs !== undefined && isEmptyGame(normalizedRs));

	if (isLoading) {
		return (
			<main className="mx-auto max-w-4xl container px-4 py-8 md:px-0 flex items-center justify-center gap-2 min-h-[40vh]">
				<Spinner />
				<p className="text-muted-foreground text-sm">Loading game…</p>
			</main>
		);
	}

	if (notFound) {
		return (
			<main className="mx-auto max-w-4xl container px-4 py-8 md:px-0 flex flex-col items-center justify-center gap-4 min-h-[40vh]">
				<p className="text-muted-foreground text-sm">Game not found.</p>
				<Link href="/">
					<Button variant="outline">Back to home</Button>
				</Link>
			</main>
		);
	}

	return (
		<GameDetailsView
			tokenId={tokenId!}
			rs={normalizedRs!}
			onRefetch={() => refetch()}
		/>
	);
}
