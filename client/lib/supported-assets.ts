import { Address } from "viem";

/**
 * Static config for supported assets: name, symbol, decimals by address.
 * Used for display when the contract's supported_assets() returns these addresses.
 * Key: address (lowercase).
 */
export type AssetConfigEntry = {
	name: string;
	symbol: string;
	decimals: number;
};

export const SUPPORTED_ASSETS: Record<string, AssetConfigEntry> = {
	"0xd24eab8a12c6d42d4614493eb2f3f9ad34b1cf5f": {
		name: "USDC",
		symbol: "USDC",
		decimals: 6,
	},
	"0xe0fb0f453abfbd74368074cf0291711fc82cbc07": {
		name: "USDT0",
		symbol: "USDT0",
		decimals: 6,
	},
	"0x1c97c5715f20445400716db9b1ea2e82f873cf35": {
		name: "WETH",
		symbol: "WETH",
		decimals: 18,
	},
};

export function getAssetConfig(address: string): AssetConfigEntry | undefined {
	return SUPPORTED_ASSETS[(address || "").toLowerCase()];
}

export function getSymbol(address: Address): string {
	return getAssetConfig(address)?.symbol ?? "??";
}

export function getDecimals(address: Address): number {
	return getAssetConfig(address)?.decimals ?? 18;
}
