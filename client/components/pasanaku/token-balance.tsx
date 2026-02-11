import { Address, formatUnits, zeroAddress } from "viem";
import { erc20Abi } from "viem";
import { useReadContracts } from "wagmi";
import { Spinner } from "../ui/spinner";
import { FieldDescription, FieldError } from "../ui/field";

type TokenBalanceProps = {
	connectedAddress?: Address;
	address: Address;
	symbol: string;
};

export function TokenBalance({
	connectedAddress,
	address,
	symbol,
}: TokenBalanceProps) {
	const { data, isPending } = useReadContracts({
		contracts: [
			{
				address: address,
				abi: erc20Abi,
				functionName: "decimals",
			},
			{
				address: address,
				abi: erc20Abi,
				functionName: "balanceOf",
				args: [connectedAddress ?? zeroAddress],
			},
		],
		query: {
			enabled: !!connectedAddress,
		},
	});

	if (isPending || !data) {
		return <Spinner />;
	}

	if (data[0].status === "failure" || data[1].status === "failure") {
		return <FieldError>Failed to fetch token balance</FieldError>;
	}

	const [decimals, balance] = data;
	const balanceWithFormatUnits = formatUnits(balance.result, decimals.result);
	const balanceFormatted = Intl.NumberFormat("en-US", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 4,
	}).format(Number(balanceWithFormatUnits));

	return (
		<FieldDescription>
			Token balance: {balanceFormatted} {symbol}
		</FieldDescription>
	);
}
