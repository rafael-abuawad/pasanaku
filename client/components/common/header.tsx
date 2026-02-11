"use client";

import { ConnectKitButton } from "connectkit";
import Link from "next/link";
import { Button } from "../ui/button";

export function Header() {
	return (
		<header className="border-border border-b px-4 py-3 sm:px-6">
			<div className="container max-w-4xl flex w-full items-center justify-between mx-auto">
				<Link
					href="/"
					className="text-foreground hover:text-primary text-xl font-medium tracking-tight sm:text-2xl [font-family:var(--font-fifties)]"
				>
					Pasanaku
				</Link>
				<div className="flex items-center gap-2">
					<Link href="/create">
						<Button
							variant="link"
							className="text-foreground hover:text-primary cursor-pointer"
						>
							Create
						</Button>
					</Link>
					<Link href="/faucet">
						<Button
							variant="link"
							className="text-foreground hover:text-primary cursor-pointer"
						>
							Faucet
						</Button>
					</Link>
					<ConnectKitButton.Custom>
						{({ isConnected, isConnecting, show, truncatedAddress }) => (
							<Button onClick={show} disabled={isConnecting} variant="outline">
								{isConnected ? (
									<span>{truncatedAddress}</span>
								) : (
									<span>Connect</span>
								)}
							</Button>
						)}
					</ConnectKitButton.Custom>
				</div>
			</div>
		</header>
	);
}
