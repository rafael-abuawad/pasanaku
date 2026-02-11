"use client";

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
import { useSupportedAssets } from "@/hooks/use-supported-assets";
import { useAppForm } from "@/hooks/use-app-form";
import { parseUnits } from "viem";

const addressRegex = /^0x[a-fA-F0-9]{40}$/;

/** Validates raw form values (players as string). Amount is human-readable (e.g. 100 or 100.5). */
const formSchema = z.object({
	asset: z
		.string()
		.min(1, "Select an asset")
		.refine((a) => addressRegex.test(a), "Invalid asset"),
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
	/** Human-readable amount (e.g. "100.5"). */
	amount: string;
	/** Amount in token smallest unit for contract calls. */
	amountRaw: bigint;
	players: string[];
};

type CreateGameFormProps = {
	onSuccess?: () => void;
	onSubmit?: (values: CreateGameFormValues) => void | Promise<void>;
};

export function CreateGameForm({ onSuccess, onSubmit }: CreateGameFormProps) {
	const {
		assets,
		isLoading: isLoadingAssets,
		getSymbol,
		getDecimals,
	} = useSupportedAssets();
	const defaultAsset = assets[0]?.address ?? "";

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
			const players = (value.players as string)
				.split(/[\n,]/)
				.map((p) => p.trim())
				.filter(Boolean);
			const decimals = getDecimals(parsed.data.asset);
			const amountRaw = parseUnits(parsed.data.amount, decimals);
			const payload: CreateGameFormValues = {
				asset: parsed.data.asset,
				amount: parsed.data.amount,
				amountRaw,
				players,
			};
			await onSubmit?.(payload);
			form.reset();
			onSuccess?.();
		},
	});

	return (
		<form
			id="create-game-form"
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			className="grid gap-4 px-4 md:px-0"
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
											{field.state.value ? getSymbol(field.state.value) : null}
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
								<FieldDescription>
									Token used for contributions in this game.
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
									Amount per round (e.g. 100 USDC). Decimals are applied
									automatically when submitting.
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

			<div className="flex gap-2 justify-end">
				<Button
					type="button"
					className="grow md:grow-0"
					variant="outline"
					onClick={() => form.reset()}
				>
					Reset
				</Button>
				<form.Subscribe
					selector={(state) => [state.canSubmit, state.isSubmitting]}
					children={([canSubmit, isSubmitting]) => (
						<Button
							type="submit"
							disabled={!canSubmit || isSubmitting}
							className="grow md:grow-0"
							form="create-game-form"
						>
							{isSubmitting ? "Creating..." : "Create game"}
						</Button>
					)}
				/>
			</div>
		</form>
	);
}
