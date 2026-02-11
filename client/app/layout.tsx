import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans } from "next/font/google";
import { Web3Provider } from "@/components/common/web3-provider";
import "./globals.css";
import { ThemeProvider } from "@/components/common/theme-provider";

const notoSans = Noto_Sans({ variable: "--font-sans" });

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Pasanaku",
	description:
		"A rotating savings protocol onchain. Create a “game,” add up to 12 players, and take turns receiving the pot each round. No new money is created—participants simply rotate who gets the pooled savings.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className={notoSans.variable} suppressHydrationWarning>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<Web3Provider>{children}</Web3Provider>
				</ThemeProvider>
			</body>
		</html>
	);
}
