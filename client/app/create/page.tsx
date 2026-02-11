import { CreateGameForm } from "@/components/pasanaku/create-game-form";
import { Separator } from "@/components/ui/separator";

export default function CreatePage() {
	return (
		<main className="container mx-auto max-w-4xl px-4 py-8 md:px-0 flex flex-col gap-6">
			<hgroup className="flex flex-col gap-2">
				<h1 className="text-foreground text-xl font-semibold">
					Create new Rotating Savings
				</h1>
				<p className="text-muted-foreground text-sm">
					Set the asset, contribution amount, and player addresses. You’ll need
					to pay the protocol a small fee in ETH when submitting.
				</p>
			</hgroup>

			<Separator />

			<CreateGameForm />
		</main>
	);
}
