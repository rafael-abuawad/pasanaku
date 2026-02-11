"use client";

import { useEffect } from "react";
import { useForm } from "@tanstack/react-form";
import * as z from "zod";
import { useWriteContract } from "wagmi";
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
import { useSupportedAssets } from "@/hooks/use-supported-assets";
import { Separator } from "@/components/ui/separator";
import { Address } from "viem";
import { parseUnits } from "viem";
import { erc20Abi } from "@/lib/abi";

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

export default function FaucetPage() {
	const { writeContract, isSuccess, error, reset } = useWriteContract();
	const {
		assets,
		isLoading: isLoadingAssets,
		getSymbol,
		getDecimals,
	} = useSupportedAssets();
	const defaultToken = assets[0]?.address ?? "";

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
			const decimals = getDecimals(parsed.data.token);
			const amountRaw = parseUnits(parsed.data.amount, decimals);
			writeContract({
				address: parsed.data.token as Address,
				abi: erc20Abi,
				functionName: "faucet",
				args: [parsed.data.address as Address, amountRaw],
			});
		},
	});

	useEffect(() => {
		if (isSuccess) {
			form.reset();
			reset();
		}
	}, [isSuccess, reset]);

	return (
		<main className="container mx-auto max-w-4xl px-4 py-8 md:px-0 flex flex-col gap-6">
			<hgroup className="flex flex-col gap-2">
				<h1 className="text-foreground text-xl font-semibold">Faucet</h1>
				<p className="text-muted-foreground text-sm">
					Mint mock tokens to an address. For development only.
				</p>
			</hgroup>

			<Separator />

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
										disabled={isLoadingAssets}
									>
										<SelectTrigger
											id={field.name}
											className="w-full"
											aria-invalid={isInvalid}
										>
											<SelectValue
												placeholder={
													isLoadingAssets ? "Loading…" : "Select token"
												}
											>
												{field.state.value
													? getSymbol(field.state.value)
													: null}
											</SelectValue>
										</SelectTrigger>
										<SelectContent>
											{assets.map((a) => (
												<SelectItem key={a.address} value={a.address}>
													{a.symbol}
												</SelectItem>
											))}
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
										Amount to mint (e.g. 100). Decimals are applied
										automatically.
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
				{error && (
					<p className="text-destructive text-sm" role="alert">
						{error.message}
					</p>
				)}
				{isSuccess && (
					<p className="text-muted-foreground text-sm" role="status">
						Mint successful.
					</p>
				)}
				<form.Subscribe
					selector={(state) => [state.canSubmit, state.isSubmitting]}
					children={([canSubmit, isSubmitting]) => (
						<Button
							type="submit"
							form="faucet-form"
							disabled={!canSubmit || isSubmitting}
						>
							{isSubmitting ? "Minting…" : "Mint"}
						</Button>
					)}
				/>
			</form>
		</main>
	);
}
