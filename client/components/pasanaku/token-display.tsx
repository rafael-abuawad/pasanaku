"use client";

import type { Address } from "viem";
import { useReadContracts } from "wagmi";
import { getAssetConfig } from "@/lib/supported-assets";
import { erc20Abi } from "@/lib/abi";
import { Spinner } from "@/components/ui/spinner";

type TokenDisplayProps = {
	address: Address;
	/** If true, show "Name (SYMBOL)" when from chain; otherwise symbol only */
	showName?: boolean;
	className?: string;
};

export function TokenDisplay({
	address,
	showName = false,
	className,
}: TokenDisplayProps) {
	const config = getAssetConfig(address);

	const { data, isPending } = useReadContracts({
		contracts:
			config === undefined
				? [
						{ address, abi: erc20Abi, functionName: "symbol" as const },
						{ address, abi: erc20Abi, functionName: "name" as const },
					]
				: [],
		query: { enabled: config === undefined },
	});

	if (config !== undefined) {
		return (
			<span className={className}>
				{showName && config.name !== config.symbol
					? `${config.name} (${config.symbol})`
					: config.symbol}
			</span>
		);
	}

	if (isPending) {
		return (
			<span className={className}>
				<Spinner className="inline-block size-3 align-middle" />
			</span>
		);
	}

	if (!data) {
		return <span className={className}>??</span>;
	}

	const symbolResult = data[0];
	const nameResult = data[1];
	const symbol =
		symbolResult?.status === "success" ? String(symbolResult.result) : "??";
	const name =
		nameResult?.status === "success" ? String(nameResult.result) : symbol;

	return (
		<span className={className}>
			{showName && name !== symbol ? `${name} (${symbol})` : symbol}
		</span>
	);
}
