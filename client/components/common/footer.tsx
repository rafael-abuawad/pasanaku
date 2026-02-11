import { Github } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";

export function Footer() {
	const Creator = () => (
		<Link
			href="https://github.com/rafael-abuawad"
			target="_blank"
			rel="noopener noreferrer"
			className="text-muted-foreground hover:text-primary transition-colors cursor-pointer"
			aria-label="Rafael Abuawad on GitHub"
		>
			<Button variant="link" className="text-sm p-0 px-2">
				Rafael Abuawad
			</Button>
		</Link>
	);
	return (
		<footer className="mt-auto border-border border-t px-4 py-6 sm:px-6">
			<div className="container max-w-4xl mx-auto flex flex-col items-center justify-center gap-3 text-center">
				<div className="flex flex-row gap-2">
					<Link
						href="/"
						className="text-foreground hover:text-primary text-xl font-medium tracking-tight sm:text-2xl [font-family:var(--font-fifties)]"
					>
						Pasanaku
					</Link>
				</div>

				<p className="text-muted-foreground text-sm font-mono">
					Created by
					<Creator />
					for the Arbitrum Openhouse 2026 hackathon
				</p>
			</div>
		</footer>
	);
}
