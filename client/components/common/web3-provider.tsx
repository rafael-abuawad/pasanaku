"use client";
import { WagmiProvider, createConfig, http } from "wagmi";
import { arbitrum } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";

const config = createConfig(
	getDefaultConfig({
		chains: [arbitrum],
		transports: {
			[arbitrum.id]: http("https://arb1.arbitrum.io/rpc"),
		},
		// TODO: update this
		walletConnectProjectId:
			process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
		appName: "Pasanaku",
		appDescription:
			"A rotating savings protocol onchain. Create a “game,” add up to 12 players, and take turns receiving the pot each round. No new money is created—participants simply rotate who gets the pooled savings.",
		// TODO: update this
		appUrl: "https://family.co",
		appIcon: "https://family.co/logo.png",
	}),
);

const queryClient = new QueryClient();

type Web3ProviderProps = {
	children: Readonly<React.ReactNode>;
};

export const Web3Provider = ({ children }: Web3ProviderProps) => {
	return (
		<WagmiProvider config={config}>
			<QueryClientProvider client={queryClient}>
				<ConnectKitProvider>{children}</ConnectKitProvider>
			</QueryClientProvider>
		</WagmiProvider>
	);
};
