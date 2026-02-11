"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { erc20Abi, pasanakuAbi } from "@/lib/abi";
import { PASANAKU_ADDRESS } from "@/lib/contract";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export type SupportedAsset = {
	address: `0x${string}`;
	symbol: string;
	decimals: number;
};

/**
 * Reads supported asset addresses from the Pasanaku contract, then fetches
 * symbol and decimals from each token contract. Returns a list of supported
 * assets with display data.
 */
export function useSupportedAssets(): {
	assets: SupportedAsset[];
	isLoading: boolean;
	getSymbol: (address: string) => string;
	getDecimals: (address: string) => number;
} {
	const { data: supportedAddresses, isLoading: isLoadingAddresses } =
		useReadContract({
			address: PASANAKU_ADDRESS,
			abi: pasanakuAbi,
			functionName: "supported_assets",
		});

	const addresses =
		(supportedAddresses as readonly `0x${string}`[] | undefined)?.filter(
			(a): a is `0x${string}` =>
				!!a && a.toLowerCase() !== ZERO_ADDRESS.toLowerCase(),
		) ?? [];

	const contractReads = addresses.flatMap((addr) => [
		{
			address: addr,
			abi: erc20Abi,
			functionName: "symbol" as const,
		},
		{
			address: addr,
			abi: erc20Abi,
			functionName: "decimals" as const,
		},
	]);

	const { data: results, isLoading: isLoadingDetails } = useReadContracts({
		contracts: contractReads,
	});

	const assets: SupportedAsset[] = [];
	if (results && results.length === contractReads.length) {
		for (let i = 0; i < addresses.length; i++) {
			const symbolResult = results[i * 2];
			const decimalsResult = results[i * 2 + 1];
			const symbol =
				symbolResult?.status === "success" && symbolResult.result != null
					? String(symbolResult.result)
					: "???";
			const decimals =
				decimalsResult?.status === "success" && decimalsResult.result != null
					? Number(decimalsResult.result)
					: 18;
			assets.push({
				address: addresses[i],
				symbol,
				decimals,
			});
		}
	}

	const getSymbol = (address: string): string => {
		const key = address.toLowerCase();
		const found = assets.find((a) => a.address.toLowerCase() === key);
		return found?.symbol ?? `${key.slice(0, 6)}…`;
	};

	const getDecimals = (address: string): number => {
		const key = address.toLowerCase();
		const found = assets.find((a) => a.address.toLowerCase() === key);
		return found?.decimals ?? 18;
	};

	return {
		assets,
		isLoading: isLoadingAddresses || isLoadingDetails,
		getSymbol,
		getDecimals,
	};
}
