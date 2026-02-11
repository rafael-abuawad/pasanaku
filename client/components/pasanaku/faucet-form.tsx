"use client";

import { useEffect } from "react";
import { useForm } from "@tanstack/react-form";
import * as z from "zod";
import { useConnection, useWriteContract } from "wagmi";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { SUPPORTED_ASSETS, getAssetConfig } from "@/lib/supported-assets";
import { Address } from "viem";
import { parseUnits } from "viem";
import { erc20Abi } from "@/lib/abi";
import { ConnectKitButton } from "connectkit";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckIcon, InfoIcon } from "lucide-react";
import {
	Item,
	ItemMedia,
	ItemContent,
	ItemTitle,
	ItemDescription,
	ItemActions,
} from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";

const addressRegex = /^0x[a-fA-F0-9]{40}$/;

const formSchema = z.object({
	token: z
		.string()
		.min(1, "Select a token")
		.refine((a) => addressRegex.test(a), "Invalid token"),
	address: z
		.string()
		.min(1, "Address is required")
		.refine((a) => addressRegex.test(a), "Invalid address"),
	amount: z
		.string()
		.min(1, "Amount is required")
		.refine(
			(s) => {
				const n = Number(s.trim());
				return !Number.isNaN(n) && n > 0;
			},
			{ message: "Amount must be a positive number" },
		),
});

function getSymbol(address: Address): string {
	return getAssetConfig(address)?.symbol ?? "??";
}

function getDecimals(address: Address): number {
	return getAssetConfig(address)?.decimals ?? 18;
}

type FaucetFormProps = {
	onSuccess?: () => void;
};

export function FaucetForm({ onSuccess }: FaucetFormProps) {
	const writeContract = useWriteContract();
	const { isConnected } = useConnection();
	const defaultToken = (Object.keys(SUPPORTED_ASSETS)[0] ?? "") as Address;

	const form = useForm({
		defaultValues: {
			token: defaultToken,
			address: "",
			amount: "",
		},
		validators: {
			onSubmit: ({ value }) => {
				const parsed = formSchema.safeParse(value);
				if (parsed.success) return undefined;
				return parsed.error.flatten().fieldErrors as Record<string, string[]>;
			},
		},
		onSubmit: async ({ value }) => {
			const parsed = formSchema.safeParse(value);
			if (!parsed.success) return;
			const decimals = getDecimals(parsed.data.token as Address);
			const amountRaw = parseUnits(parsed.data.amount, decimals);

			writeContract.mutate({
				address: parsed.data.token as Address,
				abi: erc20Abi,
				functionName: "faucet",
				args: [parsed.data.address as Address, amountRaw],
			});
		},
	});

	useEffect(() => {
		if (writeContract.status === "success") {
			form.reset();
			onSuccess?.();
		}
	}, [writeContract.status, form, onSuccess]);

	return (
		<form
			id="faucet-form"
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			className="grid gap-4"
		>
			<FieldGroup>
				<form.Field
					name="token"
					children={(field) => {
						const isInvalid =
							field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Token</FieldLabel>
								<Select
									value={field.state.value}
									onValueChange={(v) => field.handleChange(v ?? defaultToken)}
									disabled={Object.keys(SUPPORTED_ASSETS).length === 0}
								>
									<SelectTrigger
										id={field.name}
										className="w-full"
										aria-invalid={isInvalid}
									>
										<SelectValue placeholder="Select token">
											{field.state.value
												? getSymbol(field.state.value as Address)
												: null}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										{Object.entries(SUPPORTED_ASSETS).map(
											([address, config]) => (
												<SelectItem key={address} value={address}>
													{config.symbol}
													{config.name !== config.symbol
														? ` (${config.name})`
														: ""}
												</SelectItem>
											),
										)}
									</SelectContent>
								</Select>
								{isInvalid && (
									<FieldError
										errors={
											field.state.meta.errors as unknown as Array<{
												message?: string;
											}>
										}
									/>
								)}
							</Field>
						);
					}}
				/>
				<form.Field
					name="address"
					children={(field) => {
						const isInvalid =
							field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Address</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="0x..."
									className="font-mono text-sm"
									aria-invalid={isInvalid}
								/>
								<FieldDescription>
									Recipient address to mint tokens to.
								</FieldDescription>
								{isInvalid && (
									<FieldError
										errors={
											field.state.meta.errors as unknown as Array<{
												message?: string;
											}>
										}
									/>
								)}
							</Field>
						);
					}}
				/>
				<form.Field
					name="amount"
					children={(field) => {
						const isInvalid =
							field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Amount</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									type="text"
									inputMode="decimal"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="e.g. 100"
									aria-invalid={isInvalid}
								/>
								<FieldDescription>
									Amount to mint
									{form.state.values.token
										? ` (e.g. 100 ${getSymbol(form.state.values.token as Address)})`
										: ""}
									. Decimals are applied automatically.
								</FieldDescription>
								{isInvalid && (
									<FieldError
										errors={
											field.state.meta.errors as unknown as Array<{
												message?: string;
											}>
										}
									/>
								)}
							</Field>
						);
					}}
				/>
			</FieldGroup>
			{writeContract.status === "error" && (
				<Alert variant="destructive">
					<InfoIcon />
					<AlertTitle>Error</AlertTitle>
					<AlertDescription className="text-wrap">
						{writeContract.error.message}
					</AlertDescription>
				</Alert>
			)}
			{writeContract.status === "pending" && (
				<Item variant="muted">
					<ItemMedia>
						<Spinner />
					</ItemMedia>
					<ItemContent>
						<ItemTitle className="line-clamp-1">
							Processing transaction...
						</ItemTitle>
					</ItemContent>
					<ItemContent className="flex-none justify-end">
						<Link
							href={`https://arbiscan.io/tx/${writeContract.data}`}
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
				</Item>
			)}
			{writeContract.status === "success" && (
				<Item variant="muted">
					<ItemMedia variant="icon">
						<CheckIcon />
					</ItemMedia>
					<ItemContent>
						<ItemTitle>Transaction successful</ItemTitle>
						<ItemDescription>
							View the transaction on the explorer.
						</ItemDescription>
						<ItemActions>
							<Link
								href={`https://arbiscan.io/tx/${writeContract.data}`}
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
					</ItemContent>
				</Item>
			)}
			{isConnected && (
				<form.Subscribe
					selector={(state) => [state.canSubmit, state.isSubmitting]}
					children={([canSubmit, isSubmitting]) => (
						<Button
							type="submit"
							form="faucet-form"
							disabled={
								!canSubmit ||
								isSubmitting ||
								(writeContract.status !== "idle" &&
									writeContract.status !== "success")
							}
						>
							{isSubmitting ? "Minting…" : "Mint"}
						</Button>
					)}
				/>
			)}
			{!isConnected && (
				<ConnectKitButton.Custom>
					{({ isConnected, isConnecting, show, truncatedAddress }) => (
						<Button onClick={show} disabled={isConnecting} variant="outline">
							{isConnected ? (
								<span>{truncatedAddress}</span>
							) : (
								<span>Connect to mint</span>
							)}
						</Button>
					)}
				</ConnectKitButton.Custom>
			)}
		</form>
	);
}
