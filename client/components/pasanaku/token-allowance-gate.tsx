"use client";

import { type Address, erc20Abi, maxUint256 } from "viem";
import { useConnection, useReadContract, useWriteContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PASANAKU_ADDRESS } from "@/lib/contract";
import { getSymbol } from "@/lib/supported-assets";
import { useCallback } from "react";
import { ConnectKitButton } from "connectkit";

const addressRegex = /^0x[a-fA-F0-9]{40}$/;

type TokenAllowanceGateProps = {
	tokenAddress: Address | undefined;
	children: React.ReactNode;
};

export function TokenAllowanceGate({
	tokenAddress,
	children,
}: TokenAllowanceGateProps) {
	const { address, isConnected } = useConnection();
	const isValidToken =
		tokenAddress !== undefined && addressRegex.test(tokenAddress);

	const {
		data: allowance,
		isPending: isAllowancePending,
		refetch,
	} = useReadContract({
		address: isValidToken ? tokenAddress : undefined,
		abi: erc20Abi,
		functionName: "allowance",
		args: address && isValidToken ? [address, PASANAKU_ADDRESS] : undefined,
	});

	const writeContract = useWriteContract();
	const isApproving = writeContract.isPending;

	const hasAllowance = allowance !== undefined && allowance > BigInt(0);

	const handleApprove = useCallback(async () => {
		if (!tokenAddress) {
			return;
		}

		await writeContract.mutateAsync({
			address: tokenAddress,
			abi: erc20Abi,
			functionName: "approve",
			args: [PASANAKU_ADDRESS, maxUint256],
		});
		await refetch();
	}, [tokenAddress, writeContract]);

	if (!isConnected) {
		return (
			<ConnectKitButton.Custom>
				{({ isConnecting, show }) => (
					<Button
						type="button"
						onClick={show}
						disabled={isConnecting}
						className="grow md:grow-0"
					>
						Connect your wallet
					</Button>
				)}
			</ConnectKitButton.Custom>
		);
	}

	if (!address) {
		return null;
	}

	if (!isValidToken) {
		return <>{children}</>;
	}

	if (isAllowancePending || allowance === undefined) {
		return (
			<Button type="button" disabled className="grow md:grow-0">
				<Spinner className="size-4" />
				Checking…
			</Button>
		);
	}

	if (!hasAllowance) {
		const symbol = getSymbol(tokenAddress);
		return (
			<Button
				type="button"
				className="grow md:grow-0"
				disabled={isApproving}
				onClick={() => {
					handleApprove();
				}}
			>
				{isApproving ? (
					<>
						<Spinner className="size-4" />
						Approving…
					</>
				) : (
					`Approve ${symbol} for game`
				)}
			</Button>
		);
	}

	return <>{children}</>;
}
