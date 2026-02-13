"use client";

import { useEffect, useState } from "react";
import * as z from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import {
	SUPPORTED_ASSETS,
	getDecimals,
	getSymbol,
} from "@/lib/supported-assets";
import { useAppForm } from "@/hooks/use-app-form";
import { type Address, parseUnits } from "viem";
import { useConnection, useReadContract, useWriteContract } from "wagmi";
import { PASANAKU_ADDRESS } from "@/lib/contract";
import { pasanakuAbi } from "@/lib/abi";
import { TokenBalance } from "./token-balance";
import { TokenAllowanceGate } from "./token-allowance-gate";
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
import { ResponsiveActionModal } from "@/components/common/responsive-action-modal";
import { Badge } from "@/components/ui/badge";

const addressRegex = /^0x[a-fA-F0-9]{40}$/;

function abbreviateAddress(address: string): string {
	if (!address || address.length < 10) return address;
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/** Validates raw form values (players as string). Amount is human-readable (e.g. 100 or 100.5). */
const formSchema = z.object({
	asset: z
		.string()
		.min(1, "Select an asset")
		.refine((a) => addressRegex.test(a), "Invalid token"),
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
	players: z
		.string()
		.min(1, "Enter at least one player address")
		.refine(
			(s) => {
				const arr = s
					.split(/[\n,]/)
					.map((p) => p.trim())
					.filter(Boolean);
				return (
					arr.length >= 1 &&
					arr.length <= 12 &&
					arr.every((a) => addressRegex.test(a))
				);
			},
			{ message: "Between 1 and 12 valid 0x addresses" },
		),
});

export type CreateGameFormValues = {
	asset: string;
	amount: string;
	amountRaw: bigint;
	players: string[];
};

const ASSET_OPTIONS = Object.entries(SUPPORTED_ASSETS);

export function CreateGameForm() {
	const defaultAsset = ASSET_OPTIONS[0]?.[0] ?? "";
	const { address } = useConnection();
	const [confirmModalOpen, setConfirmModalOpen] = useState(false);

	const { data: protocolFee, isPending: isProtocolFeePending } =
		useReadContract({
			address: PASANAKU_ADDRESS,
			abi: pasanakuAbi,
			functionName: "protocol_fee",
		});

	const writeContract = useWriteContract();

	const form = useAppForm({
		defaultValues: {
			asset: defaultAsset,
			amount: "",
			players: "",
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
			if (protocolFee === undefined) {
				return;
			}
			const players = (value.players as string)
				.split(/[\n,]/)
				.map((p) => p.trim())
				.filter(Boolean) as Address[];
			const decimals = getDecimals(parsed.data.asset as Address);
			const amountRaw = parseUnits(parsed.data.amount, decimals);
			writeContract.writeContract({
				address: PASANAKU_ADDRESS,
				abi: pasanakuAbi,
				functionName: "create",
				args: [parsed.data.asset as Address, players, amountRaw],
				value: protocolFee,
			});
		},
	});

	function openConfirmModal() {
		const parsed = formSchema.safeParse(form.state.values);
		if (!parsed.success) return;
		setConfirmModalOpen(true);
	}

	function handleConfirmCreate() {
		form.handleSubmit();
		setConfirmModalOpen(false);
	}

	useEffect(() => {
		if (writeContract.status === "success") {
			form.reset();
		}
	}, [writeContract.status, form]);

	const txHash =
		writeContract.status === "pending" || writeContract.status === "success"
			? (writeContract as { data?: string }).data
			: undefined;

	const confirmPlayers = form.state.values.players
		? (form.state.values.players as string)
				.split(/[\n,]/)
				.map((p) => p.trim())
				.filter(Boolean)
		: [];
	const confirmAmount = form.state.values.amount;
	const confirmAsset = form.state.values.asset;
	const confirmSymbol = confirmAsset ? getSymbol(confirmAsset as Address) : "";

	return (
		<>
			<form
				id="create-game-form"
				onSubmit={(e) => {
					e.preventDefault();
					form.handleSubmit();
				}}
				className="grid gap-4"
			>
				<FieldGroup>
					<form.Field
						name="asset"
						children={(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Asset</FieldLabel>
									<Select
										value={field.state.value}
										onValueChange={(v) => field.handleChange(v ?? defaultAsset)}
										disabled={ASSET_OPTIONS.length === 0}
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
											{ASSET_OPTIONS.map(([address, config]) => (
												<SelectItem key={address} value={address}>
													{config.symbol}
													{config.name !== config.symbol
														? ` (${config.name})`
														: ""}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<TokenBalance
										connectedAddress={address}
										address={field.state.value as Address}
										symbol={getSymbol(field.state.value as Address)}
									/>
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
									<FieldLabel htmlFor={field.name}>
										Contribution amount
									</FieldLabel>
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
										Amount per round
										{form.state.values.asset
											? ` (e.g. 100 ${getSymbol(form.state.values.asset as Address)})`
											: ""}
										. Decimals applied automatically.
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
						name="players"
						children={(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Player addresses</FieldLabel>
									<Textarea
										id={field.name}
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="0x...&#10;0x...&#10;(one per line or comma-separated)"
										rows={5}
										className="font-mono text-xs"
										aria-invalid={isInvalid}
									/>
									<FieldDescription>
										One address per line or comma-separated. Between 1 and 12
										players.
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
					<Alert variant="destructive" className="mt-4">
						<InfoIcon />
						<AlertTitle>Error</AlertTitle>
						<AlertDescription className="text-wrap">
							{writeContract.error?.message}
						</AlertDescription>
					</Alert>
				)}
				{writeContract.status === "pending" && (
					<Item variant="muted" className="mt-4">
						<ItemMedia>
							<Spinner />
						</ItemMedia>
						<ItemContent>
							<ItemTitle className="line-clamp-1">
								Processing transaction...
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
				{writeContract.status === "success" && (
					<Item variant="muted" className="mt-4">
						<ItemMedia variant="icon">
							<CheckIcon />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>Transaction successful</ItemTitle>
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

				<div className="flex gap-2 justify-end mt-4">
					<Button
						type="button"
						className="grow md:grow-0"
						variant="outline"
						onClick={() => form.reset()}
					>
						Reset
					</Button>
					<form.Subscribe
						selector={(state) => [state.values.asset]}
						children={([asset]) => (
							<TokenAllowanceGate
								tokenAddress={
									asset && addressRegex.test(asset)
										? (asset as Address)
										: undefined
								}
							>
								<form.Subscribe
									selector={(state) => [state.canSubmit, state.isSubmitting]}
									children={([canSubmit, isSubmitting]) => (
										<Button
											type="button"
											disabled={
												!canSubmit ||
												isSubmitting ||
												protocolFee === undefined ||
												isProtocolFeePending ||
												writeContract.isPending
											}
											className="grow md:grow-0"
											onClick={openConfirmModal}
										>
											{isSubmitting || writeContract.isPending
												? "Creating..."
												: "Create game"}
										</Button>
									)}
								/>
							</TokenAllowanceGate>
						)}
					/>
				</div>
			</form>

			<ResponsiveActionModal
				open={confirmModalOpen}
				onOpenChange={setConfirmModalOpen}
				title="Confirm create game"
				description="Review the game details before creating."
				contentClassName="grid gap-4 pt-2"
			>
				<div className="grid gap-3 text-sm">
					<div className="flex justify-between gap-2">
						<span className="text-muted-foreground">Amount per round</span>
						<span className="font-medium">
							{confirmAmount} {confirmSymbol}
						</span>
					</div>
					<div className="flex justify-between gap-2">
						<span className="text-muted-foreground">Player count</span>
						<span className="font-medium">{confirmPlayers.length}</span>
					</div>
					<div className="flex justify-between gap-2 items-center">
						<span className="text-muted-foreground">Asset</span>
						<Badge variant="secondary">{confirmSymbol}</Badge>
					</div>
					<div className="grid gap-2">
						<span className="text-muted-foreground">Players</span>
						<div className="flex flex-wrap gap-2">
							{confirmPlayers.map((playerAddress, i) => (
								<Badge
									key={`${playerAddress}-${i}`}
									variant="outline"
									className="inline-flex items-center gap-1.5 py-1 pr-2 pl-1 h-auto"
								>
									<span className="font-mono">
										{abbreviateAddress(playerAddress)}
									</span>
								</Badge>
							))}
						</div>
					</div>
				</div>
				<div className="flex gap-2 justify-end pt-2">
					<Button
						type="button"
						variant="outline"
						onClick={() => setConfirmModalOpen(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={handleConfirmCreate}
						disabled={writeContract.isPending}
					>
						{writeContract.isPending ? "Creating…" : "Confirm"}
					</Button>
				</div>
			</ResponsiveActionModal>
		</>
	);
}
