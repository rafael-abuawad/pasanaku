import { FaucetForm } from "@/components/pasanaku/faucet-form";
import { Separator } from "@/components/ui/separator";

export default function FaucetPage() {
	return (
		<main className="container mx-auto max-w-4xl px-4 py-8 md:px-0 flex flex-col gap-6">
			<hgroup className="flex flex-col gap-2">
				<h1 className="text-foreground text-xl font-semibold">Faucet</h1>
				<p className="text-muted-foreground text-sm">
					Mint mock tokens to an address. For testing purposes only.
				</p>
			</hgroup>

			<Separator />

			<FaucetForm />
		</main>
	);
}
