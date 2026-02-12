"use client";

import { useReadContracts } from "wagmi";
import { pasanakuAbi } from "@/lib/abi";
import { PASANAKU_ADDRESS } from "@/lib/contract";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import type { Address } from "viem";

function abbreviateAddress(address: string): string {
	if (!address || address.length < 10) return address;
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

type DepositsTableProps = {
	tokenId: bigint;
	currentRoundIndex: bigint;
	players: readonly `0x${string}`[];
};

export function DepositsTable({
	tokenId,
	currentRoundIndex,
	players,
}: DepositsTableProps) {
	const currentIdx = Number(currentRoundIndex);
	const payers = players.filter((_, i) => i !== currentIdx);
	const recipient = players[currentIdx] ?? players[0];

	const contracts = payers.map((player) => ({
		address: PASANAKU_ADDRESS,
		abi: pasanakuAbi,
		functionName: "has_deposited" as const,
		args: [player, tokenId, currentRoundIndex] as const,
	}));

	const { data: results, isLoading } = useReadContracts({ contracts });

	if (isLoading || !results) {
		return (
			<Card>
				<CardHeader>
					<span className="text-foreground font-medium">Deposits</span>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-center gap-2 py-6">
						<Spinner />
						<span className="text-muted-foreground text-sm">
							Loading deposits…
						</span>
					</div>
				</CardContent>
			</Card>
		);
	}

	const depositStatuses = results.map(
		(r) => r.status === "success" && r.result === true,
	);

	return (
		<Card>
			<CardHeader>
				<span className="text-foreground font-medium">Deposits</span>
				<span className="text-muted-foreground text-sm">
					Round {currentIdx + 1} · Current recipient:{" "}
					{abbreviateAddress(recipient as string)}
				</span>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Player</TableHead>
							<TableHead className="text-right">Status</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{payers.map((player, i) => (
							<TableRow key={(player as Address) + String(i)}>
								<TableCell className="font-mono text-xs">
									{abbreviateAddress(player as string)}
								</TableCell>
								<TableCell className="text-right">
									{depositStatuses[i] ? (
										<Badge variant="secondary">Deposited</Badge>
									) : (
										<Badge variant="outline">Pending</Badge>
									)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}
