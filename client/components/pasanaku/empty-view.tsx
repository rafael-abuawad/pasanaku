"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ResponsiveActionModal } from "@/components/common/responsive-action-modal";
import { CreateGameForm } from "@/components/pasanaku/create-game-form";
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { CirclePlus, Wallet, Gift, RotateCcw } from "lucide-react";

const dottedBoxClassName =
	"bg-background text-foreground flex min-w-0 flex-1 flex-col items-center justify-center gap-2 border border-dashed rounded-md p-8 sm:p-12";

const howItWorksCards = [
	{
		icon: CirclePlus,
		title: "Create",
		description:
			"Define the asset (e.g. USDC), contribution amount per round, and up to 12 players. Each player receives an NFT representing their spot in the game.",
	},
	{
		icon: Wallet,
		title: "Deposit",
		description:
			"Each round, every player except the current recipient deposits the fixed amount. The contract tracks who has paid. Rounds are typically monthly.",
	},
	{
		icon: Gift,
		title: "Claim",
		description:
			"When all other players have deposited, the current recipient claims the full pot. The game then advances to the next player as recipient.",
	},
	{
		icon: RotateCcw,
		title: "Recover",
		description:
			"If the game gets stuck (e.g. the current recipient never claims), after a wait period participants can recover their own deposited amount for that round.",
	},
];

type EmptyViewProps = {
	className?: string;
	containerClassName?: string;
};

/**
 * Empty state when no wallet is connected or no pasanakus exist.
 * Uses the same dotted outline style as the example component.
 * "Create new Rotating Savings" opens a responsive dialog with the create-game form.
 */
export function EmptyView({ className, containerClassName }: EmptyViewProps) {
	const [createOpen, setCreateOpen] = React.useState(false);

	return (
		<>
			<div
				className={cn(
					"mx-auto container max-w-4xl flex w-full min-w-0 flex-col content-center items-center justify-center gap-8 py-4 px-4 md:py-8 md:px-0",
					containerClassName,
				)}
			>
				<section className="w-full " aria-label="How Pasanaku works">
					<h2 className="text-foreground mb-4 text-center text-lg font-semibold md:text-left">
						How it works
					</h2>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{howItWorksCards.map(({ icon: Icon, title, description }) => (
							<Card key={title} size="sm" className="flex flex-col">
								<CardHeader>
									<div className="flex items-center gap-2">
										<Icon
											className="text-muted-foreground size-4 shrink-0"
											aria-hidden
										/>
										<CardTitle>{title}</CardTitle>
									</div>
									<CardDescription className="mt-1">
										{description}
									</CardDescription>
								</CardHeader>
							</Card>
						))}
					</div>
				</section>
				<button
					type="button"
					onClick={() => setCreateOpen(true)}
					data-slot="empty-view-content"
					className={cn(
						dottedBoxClassName,
						"w-full cursor-pointer transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",

						className,
					)}
				>
					<p className="text-muted-foreground text-sm font-medium">
						Create new
					</p>
					<p className="text-foreground text-center text-2xl font-semibold sm:text-3xl">
						Rotating Savings
					</p>
				</button>
			</div>
			<ResponsiveActionModal
				open={createOpen}
				onOpenChange={setCreateOpen}
				title="Create new Rotating Savings"
				description="Set the asset, contribution amount, and player addresses. You’ll need to pay the protocol a small fee in ETH when submitting."
				contentClassName="grid gap-4"
			>
				<CreateGameForm onSuccess={() => setCreateOpen(false)} />
			</ResponsiveActionModal>
		</>
	);
}
