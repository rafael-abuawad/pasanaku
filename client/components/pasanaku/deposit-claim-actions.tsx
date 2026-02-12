"use client";

import { useState, useCallback, useEffect } from "react";
import { formatUnits } from "viem";
import type { Address } from "viem";
import { useConnection, useReadContract, useWriteContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
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

	const { data: currentPlayer } = useReadContract({
		address: PASANAKU_ADDRESS,
		abi: pasanakuAbi,
		functionName: "current_player",
		args: [tokenId],
	});

	const { data: canClaim } = useReadContract({
		address: PASANAKU_ADDRESS,
		abi: pasanakuAbi,
		functionName: "can_current_recipient_claim",
		args: [tokenId],
	});

	const { data: hasDeposited } = useReadContract({
		address: PASANAKU_ADDRESS,
		abi: pasanakuAbi,
		functionName: "has_deposited",
		args:
			address !== undefined
				? [address, tokenId, rs.current_player_index]
				: undefined,
	});

	const writeContract = useWriteContract();

	const isCurrentRecipient =
		address !== undefined &&
		currentPlayer !== undefined &&
		address.toLowerCase() === (currentPlayer as string).toLowerCase();
	const isPlayer =
		address !== undefined &&
		rs.players.some((p) => p.toLowerCase() === address.toLowerCase());
	const canShowClaim = !rs.ended && isCurrentRecipient && canClaim === true;
	const canShowDeposit =
		!rs.ended && isPlayer && !isCurrentRecipient && hasDeposited === false;
	const alreadyDeposited =
		!rs.ended && isPlayer && !isCurrentRecipient && hasDeposited === true;

	useEffect(() => {
		if (writeContract.status === "success") {
			onSuccess?.();
		}
	}, [writeContract.status, onSuccess]);

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
				<Button
					type="button"
					onClick={() => {
						console.debug("[DepositClaimActions] Opening claim modal");
						setClaimModalOpen(true);
					}}
					disabled={writeContract.isPending || protocolFee === undefined}
				>
					{writeContract.isPending ? (
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
						disabled={writeContract.isPending || protocolFee === undefined}
					>
						{writeContract.isPending ? "Claiming…" : "Confirm"}
					</Button>
				</ResponsiveActionModal>
			</>
		);
	}

	if (canShowDeposit) {
		return (
			<>
				<TokenAllowanceGate tokenAddress={rs.asset as Address}>
					<Button
						type="button"
						onClick={() => {
							console.debug("[DepositClaimActions] Opening deposit modal");
							setDepositModalOpen(true);
						}}
						disabled={writeContract.isPending || protocolFee === undefined}
					>
						{writeContract.isPending ? (
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
						disabled={writeContract.isPending || protocolFee === undefined}
					>
						{writeContract.isPending ? "Depositing…" : "Confirm"}
					</Button>
				</ResponsiveActionModal>
			</>
		);
	}

	return null;
}
