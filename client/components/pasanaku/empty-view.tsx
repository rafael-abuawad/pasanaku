"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { CirclePlus, Plus, Wallet, Gift, RotateCcw } from "lucide-react";

const dottedBoxClassName =
	"bg-background text-foreground flex min-w-0 flex-1 flex-col items-center justify-center gap-4 border border-dashed rounded-md p-8 sm:p-12";

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
 * "Create new Rotating Savings" links to /create.
 */
export function EmptyView({ className, containerClassName }: EmptyViewProps) {
	return (
		<div
			className={cn(
				"mx-auto container max-w-4xl flex w-full min-w-0 flex-col content-center items-center justify-center gap-8 py-4 px-4 md:py-8 md:px-0",
				containerClassName,
			)}
		>
			<section className="w-full" aria-label="How Pasanaku works">
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
			<Link
				href="/create"
				data-slot="empty-view-content"
				className={cn(
					dottedBoxClassName,
					"w-full cursor-pointer transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
					className,
				)}
			>
				<div className="flex items-center justify-center -space-x-2">
					<div
						className="bg-muted size-10 rounded-full shrink-0 flex items-center justify-center text-muted-foreground"
						aria-hidden
					>
						<Plus className="size-5" strokeWidth={2.5} />
					</div>
				</div>
				<div className="flex flex-col items-center justify-center gap-1">
					<h3 className="text-foreground text-center text-xl font-semibold sm:text-2xl">
						No Rotating Savings
					</h3>
					<p className="text-muted-foreground text-center text-sm">
						Create your first game and invite players to contribute.
					</p>
				</div>
				<span className="inline-flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5 text-sm font-medium text-foreground mt-1">
					<Plus className="size-4" strokeWidth={2.5} />
					Create new
				</span>
			</Link>
		</div>
	);
}
