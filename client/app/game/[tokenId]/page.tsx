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

	const isLoading = isLoadingNextId || (tokenId !== null && isLoadingRs);
	const outOfRange =
		tokenId !== null && nextTokenId !== undefined && tokenId >= nextTokenId;
	const notFound =
		tokenId === null ||
		outOfRange ||
		(rs !== undefined && isEmptyGame(rs as RotatingSavings));

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
			rs={rs as RotatingSavings}
			onRefetch={() => refetch()}
		/>
	);
}
