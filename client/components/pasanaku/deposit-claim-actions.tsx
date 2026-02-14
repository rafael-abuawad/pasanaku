"use client";

import { useState, useCallback, useEffect } from "react";
import { formatUnits } from "viem";
import type { Address } from "viem";
import {
	useConnection,
	useReadContract,
	useWaitForTransactionReceipt,
	useWriteContract,
} from "wagmi";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	Item,
	ItemMedia,
	ItemContent,
	ItemTitle,
	ItemDescription,
	ItemActions,
} from "@/components/ui/item";
import { CheckIcon, InfoIcon } from "lucide-react";
import { PASANAKU_ADDRESS } from "@/lib/contract";
import { pasanakuAbi } from "@/lib/abi";
import { getDecimals, getSymbol } from "@/lib/supported-assets";
import { TokenAllowanceGate } from "./token-allowance-gate";
import { ResponsiveActionModal } from "@/components/common/responsive-action-modal";
import type { RotatingSavings } from "./ongoing-game-card";

const numberFormat = Intl.NumberFormat("en-US", {
	minimumFractionDigits: 0,
	maximumFractionDigits: 6,
});

function formatTokenAmount(amount: bigint, decimals: number): string {
	return numberFormat.format(Number(formatUnits(amount, decimals)));
}

type DepositClaimActionsProps = {
	tokenId: bigint;
	rs: RotatingSavings;
	protocolFee: bigint | undefined;
	onSuccess?: () => void;
};

export function DepositClaimActions({
	tokenId,
	rs,
	protocolFee,
	onSuccess,
}: DepositClaimActionsProps) {
	const { address } = useConnection();
	const [claimModalOpen, setClaimModalOpen] = useState(false);
	const [depositModalOpen, setDepositModalOpen] = useState(false);

	const { data: canClaim, refetch: refetchCanClaim } = useReadContract({
		address: PASANAKU_ADDRESS,
		abi: pasanakuAbi,
		functionName: "can_claim",
		args: address !== undefined ? [address, tokenId] : undefined,
	});

	const { data: canDeposit, refetch: refetchCanDeposit } = useReadContract({
		address: PASANAKU_ADDRESS,
		abi: pasanakuAbi,
		functionName: "can_deposit",
		args: address !== undefined ? [address, tokenId] : undefined,
	});

	const { data: hasDeposited, refetch: refetchHasDeposited } = useReadContract({
		address: PASANAKU_ADDRESS,
		abi: pasanakuAbi,
		functionName: "has_deposited",
		args:
			address !== undefined ? [address, tokenId, rs.current_index] : undefined,
	});

	const writeContract = useWriteContract();

	const txHash =
		writeContract.status === "pending" || writeContract.status === "success"
			? (writeContract as { data?: `0x${string}` }).data
			: undefined;

	const {
		data: receipt,
		isLoading: isWaitingReceipt,
		error: receiptError,
	} = useWaitForTransactionReceipt({ hash: txHash });

	useEffect(() => {
		if (receipt === undefined) return;
		console.debug(
			"[DepositClaimActions] Transaction confirmed, refetching state",
			{
				tokenId: String(tokenId),
			},
		);
		refetchCanClaim();
		refetchCanDeposit();
		refetchHasDeposited();
		onSuccess?.();
	}, [
		receipt,
		tokenId,
		refetchCanClaim,
		refetchCanDeposit,
		refetchHasDeposited,
		onSuccess,
	]);

	const canShowClaim = !rs.ended && canClaim === true;
	const canShowDeposit = !rs.ended && canDeposit === true;
	const alreadyDeposited = !rs.ended && hasDeposited === true;

	const handleConfirmClaim = useCallback(() => {
		if (protocolFee === undefined) return;
		console.debug("[DepositClaimActions] Submitting claim", {
			tokenId: String(tokenId),
		});
		writeContract.writeContract({
			address: PASANAKU_ADDRESS,
			abi: pasanakuAbi,
			functionName: "claim",
			args: [tokenId],
			value: protocolFee,
		});
		setClaimModalOpen(false);
	}, [tokenId, protocolFee, writeContract]);

	const handleConfirmDeposit = useCallback(() => {
		if (protocolFee === undefined) return;
		console.debug("[DepositClaimActions] Submitting deposit", {
			tokenId: String(tokenId),
		});
		writeContract.writeContract({
			address: PASANAKU_ADDRESS,
			abi: pasanakuAbi,
			functionName: "deposit",
			args: [tokenId],
			value: protocolFee,
		});
		setDepositModalOpen(false);
	}, [tokenId, protocolFee, writeContract]);

	const decimals = getDecimals(rs.asset as Address);
	const symbol = getSymbol(rs.asset as Address);
	const expectedTotal = rs.amount * BigInt(Number(rs.player_count) - 1);
	const claimAmountFormatted = formatTokenAmount(expectedTotal, decimals);

	const isPending =
		writeContract.isPending || (txHash !== undefined && isWaitingReceipt);
	const isConfirmed = receipt !== undefined;
	const errorMessage =
		writeContract.error?.message ?? receiptError?.message ?? undefined;
	const showError =
		(writeContract.status === "error" || receiptError) && errorMessage;

	if (rs.ended) {
		return <p className="text-muted-foreground text-sm">Game ended.</p>;
	}

	if (alreadyDeposited) {
		return (
			<p className="text-muted-foreground text-sm">
				You have deposited for this round.
			</p>
		);
	}

	if (canShowClaim) {
		return (
			<>
				{showError && (
					<Alert variant="destructive" className="mb-3">
						<InfoIcon />
						<AlertTitle>Error</AlertTitle>
						<AlertDescription className="text-wrap">
							{errorMessage}
						</AlertDescription>
					</Alert>
				)}
				{isPending && (
					<Item variant="muted" className="mb-3">
						<ItemMedia>
							<Spinner />
						</ItemMedia>
						<ItemContent>
							<ItemTitle className="line-clamp-1">
								Processing claim...
							</ItemTitle>
						</ItemContent>
						{txHash && (
							<ItemContent className="flex-none justify-end">
								<Link
									href={`https://arbiscan.io/tx/${txHash}`}
									target="_blank"
									rel="noopener noreferrer"
								>
									<Button
										variant="outline"
										className="text-muted-foreground hover:text-primary"
										size="sm"
									>
										Arbiscan link
									</Button>
								</Link>
							</ItemContent>
						)}
					</Item>
				)}
				{isConfirmed && (
					<Item variant="muted" className="mb-3">
						<ItemMedia variant="icon">
							<CheckIcon />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>Claim successful</ItemTitle>
							<ItemDescription>
								View the transaction on the explorer.
							</ItemDescription>
							{txHash && (
								<ItemActions>
									<Link
										href={`https://arbiscan.io/tx/${txHash}`}
										target="_blank"
										rel="noopener noreferrer"
									>
										<Button
											variant="outline"
											className="text-muted-foreground hover:text-primary"
											size="sm"
										>
											Arbiscan link
										</Button>
									</Link>
								</ItemActions>
							)}
						</ItemContent>
					</Item>
				)}
				<Button
					type="button"
					onClick={() => {
						console.debug("[DepositClaimActions] Opening claim modal");
						setClaimModalOpen(true);
					}}
					disabled={isPending || protocolFee === undefined}
				>
					{isPending ? (
						<>
							<Spinner className="size-4" />
							Claiming…
						</>
					) : (
						"Claim"
					)}
				</Button>
				<ResponsiveActionModal
					open={claimModalOpen}
					onOpenChange={setClaimModalOpen}
					title="Confirm claim"
					description={`You are about to claim ${claimAmountFormatted} ${symbol}.`}
					contentClassName="flex gap-2 justify-end pt-2"
				>
					<Button
						type="button"
						variant="outline"
						onClick={() => setClaimModalOpen(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={handleConfirmClaim}
						disabled={isPending || protocolFee === undefined}
					>
						{isPending ? "Claiming…" : "Confirm"}
					</Button>
				</ResponsiveActionModal>
			</>
		);
	}

	if (canShowDeposit) {
		return (
			<>
				{showError && (
					<Alert variant="destructive" className="mb-3">
						<InfoIcon />
						<AlertTitle>Error</AlertTitle>
						<AlertDescription className="text-wrap">
							{errorMessage}
						</AlertDescription>
					</Alert>
				)}
				{isPending && (
					<Item variant="muted" className="mb-3">
						<ItemMedia>
							<Spinner />
						</ItemMedia>
						<ItemContent>
							<ItemTitle className="line-clamp-1">
								Processing deposit...
							</ItemTitle>
						</ItemContent>
						{txHash && (
							<ItemContent className="flex-none justify-end">
								<Link
									href={`https://arbiscan.io/tx/${txHash}`}
									target="_blank"
									rel="noopener noreferrer"
								>
									<Button
										variant="outline"
										className="text-muted-foreground hover:text-primary"
										size="sm"
									>
										Arbiscan link
									</Button>
								</Link>
							</ItemContent>
						)}
					</Item>
				)}
				{isConfirmed && (
					<Item variant="muted" className="mb-3">
						<ItemMedia variant="icon">
							<CheckIcon />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>Deposit successful</ItemTitle>
							<ItemDescription>
								View the transaction on the explorer.
							</ItemDescription>
							{txHash && (
								<ItemActions>
									<Link
										href={`https://arbiscan.io/tx/${txHash}`}
										target="_blank"
										rel="noopener noreferrer"
									>
										<Button
											variant="outline"
											className="text-muted-foreground hover:text-primary"
											size="sm"
										>
											Arbiscan link
										</Button>
									</Link>
								</ItemActions>
							)}
						</ItemContent>
					</Item>
				)}
				<TokenAllowanceGate tokenAddress={rs.asset as Address}>
					<Button
						type="button"
						onClick={() => {
							console.debug("[DepositClaimActions] Opening deposit modal");
							setDepositModalOpen(true);
						}}
						disabled={isPending || protocolFee === undefined}
					>
						{isPending ? (
							<>
								<Spinner className="size-4" />
								Depositing…
							</>
						) : (
							"Deposit"
						)}
					</Button>
				</TokenAllowanceGate>
				<ResponsiveActionModal
					open={depositModalOpen}
					onOpenChange={setDepositModalOpen}
					title="Confirm deposit"
					description={`You are about to deposit ${formatTokenAmount(rs.amount, decimals)} ${symbol} for this round.`}
					contentClassName="flex gap-2 justify-end pt-2"
				>
					<Button
						type="button"
						variant="outline"
						onClick={() => setDepositModalOpen(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={handleConfirmDeposit}
						disabled={isPending || protocolFee === undefined}
					>
						{isPending ? "Depositing…" : "Confirm"}
					</Button>
				</ResponsiveActionModal>
			</>
		);
	}

	return null;
}
