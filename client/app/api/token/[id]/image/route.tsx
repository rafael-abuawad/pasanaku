import { ImageResponse } from "next/og";
import { formatUnits, zeroAddress } from "viem";
import {
	getRotatingSavings,
	type RotatingSavingsResult,
} from "@/lib/viem-server";
import { getDecimals, getSymbol } from "@/lib/supported-assets";
import type { Address } from "viem";

const DAYS_30 = 60 * 60 * 24 * 30;

const numberFormat = Intl.NumberFormat("en-US", {
	minimumFractionDigits: 0,
	maximumFractionDigits: 6,
});

function formatTokenAmount(amount: bigint, decimals: number): string {
	return numberFormat.format(Number(formatUnits(amount, decimals)));
}

function parseTokenId(value: string | null): bigint | null {
	if (value === null || value === "") return null;
	const n = Number(value);
	if (Number.isNaN(n) || n < 0 || !Number.isInteger(n)) return null;
	return BigInt(value);
}

function isEmptyGame(rs: RotatingSavingsResult): boolean {
	return (
		rs.player_count === BigInt(0) ||
		rs.players.length === 0 ||
		(rs.asset as string).toLowerCase() === zeroAddress
	);
}

type Status = "Active" | "Ended" | "Stale";

function getStatus(rs: RotatingSavingsResult): Status {
	if (rs.ended) return "Ended";
	const now = Math.floor(Date.now() / 1000);
	if (now - Number(rs.last_updated_at) >= DAYS_30) return "Stale";
	return "Active";
}

function getStatusGradient(status: Status): string {
	switch (status) {
		case "Active":
			return "linear-gradient(to bottom, #0a0a0f 0%, #0f172a 25%, #166534 50%, #ec4899 85%, #7c3aed 100%)";
		case "Ended":
			return "linear-gradient(to bottom, #0a0a0f 0%, #1e1b4b 40%, #312e81 70%, #4c1d95 100%)";
		case "Stale":
			return "linear-gradient(to bottom, #1c1917 0%, #44403c 40%, #78716c 70%, #b45309 100%)";
	}
}

function shortAddress(address: string): string {
	if (address.length < 10) return address;
	return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export async function GET(
	request: Request,
	context: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await context.params;
		const tokenId = parseTokenId(id ?? null);
		if (tokenId === null) {
			return new Response("Invalid or missing id", { status: 400 });
		}

		const rs = await getRotatingSavings(tokenId);
		if (!rs || isEmptyGame(rs)) {
			return new Response("Game not found", { status: 404 });
		}

		const decimals = getDecimals(rs.asset as Address);
		const symbol = getSymbol(rs.asset as Address);
		const status = getStatus(rs);
		const formattedAmount = formatTokenAmount(rs.amount, decimals);
		const formattedPot = formatTokenAmount(rs.total_deposited, decimals);
		const createdDate = new Date(
			Number(rs.created_at) * 1000,
		).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
		const creatorShort = shortAddress(rs.creator as string);
		const roundCurrent = Number(rs.current_index) + 1;
		const roundTotal = Number(rs.player_count);
		const gradient = getStatusGradient(status);

		return new ImageResponse(
			<div
				style={{
					position: "relative",
					height: "100%",
					width: "100%",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					background: gradient,
					fontFamily: "ui-monospace, Monaco, Consolas, monospace",
				}}
			>
				{/* Inner card with border - vertical layout */}
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						width: "88%",
						height: "92%",
						borderRadius: 24,
						border: "2px solid rgba(255,255,255,0.25)",
						backgroundColor: "rgba(0,0,0,0.35)",
						padding: 40,
						justifyContent: "space-between",
						alignItems: "stretch",
					}}
				>
					{/* Top: title + amount */}
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
						}}
					>
						<div
							style={{
								display: "flex",
								fontSize: 44,
								fontWeight: 700,
								color: "white",
								letterSpacing: -1,
								marginBottom: 6,
							}}
						>
							Pasanaku #{String(rs.token_id)}
						</div>
						<div
							style={{
								display: "flex",
								fontSize: 30,
								backgroundImage:
									"linear-gradient(90deg, rgb(34, 197, 94), rgb(236, 72, 153))",
								backgroundClip: "text",
								color: "transparent",
							}}
						>
							{formattedAmount} {symbol}
						</div>
					</div>

					{/* Middle: progress - large ring and bar */}
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: 24,
						}}
					>
						<div
							style={{
								display: "flex",
								width: 280,
								height: 280,
								borderRadius: "50%",
								border: "8px solid rgba(255,255,255,0.25)",
								alignItems: "center",
								justifyContent: "center",
								fontSize: 56,
								fontWeight: 700,
								color: "white",
							}}
						>
							{`${roundCurrent}/${roundTotal}`}
						</div>
						<div
							style={{
								display: "flex",
								width: 320,
								height: 20,
								backgroundColor: "rgba(0,0,0,0.4)",
								borderRadius: 10,
								overflow: "hidden",
							}}
						>
							<div
								style={{
									display: "flex",
									width: `${(roundCurrent / roundTotal) * 100}%`,
									height: "100%",
									backgroundColor: "rgba(34, 197, 94, 0.9)",
									borderRadius: 10,
								}}
							/>
						</div>
					</div>

					{/* Bottom: data boxes */}
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: 10,
						}}
					>
						<div
							style={{
								backgroundColor: "rgba(0,0,0,0.5)",
								borderRadius: 8,
								padding: "12px 16px",
								fontSize: 20,
								color: "white",
								display: "flex",
								alignItems: "center",
							}}
						>
							ID: {String(rs.token_id)}
						</div>
						<div
							style={{
								backgroundColor: "rgba(0,0,0,0.5)",
								borderRadius: 8,
								padding: "12px 16px",
								fontSize: 20,
								color: "white",
								display: "flex",
							}}
						>
							Players: {String(rs.player_count)} · Round {roundCurrent} of{" "}
							{roundTotal}
						</div>
						<div
							style={{
								backgroundColor: "rgba(0,0,0,0.5)",
								borderRadius: 8,
								padding: "12px 16px",
								fontSize: 20,
								color: "white",
								display: "flex",
								alignItems: "center",
							}}
						>
							Pot: {formattedPot} {symbol} · {status}
						</div>
						<div
							style={{
								backgroundColor: "rgba(0,0,0,0.5)",
								borderRadius: 8,
								padding: "12px 16px",
								fontSize: 20,
								color: "white",
								display: "flex",
								alignItems: "center",
							}}
						>
							Created: {createdDate} · {creatorShort}
						</div>
					</div>
				</div>

				{/* Edge: faint creator/contract */}
				<div
					style={{
						display: "flex",
						position: "absolute",
						bottom: 16,
						left: 24,
						fontSize: 14,
						color: "rgba(255,255,255,0.35)",
						fontFamily: "ui-monospace, Monaco, Consolas, monospace",
					}}
				>
					{creatorShort}
				</div>
				<div
					style={{
						display: "flex",
						position: "absolute",
						top: 16,
						right: 24,
						fontSize: 18,
						color: "rgba(255,255,255,0.4)",
						transform: "rotate(90deg)",
						transformOrigin: "top right",
						fontFamily: "ui-monospace, Monaco, Consolas, monospace",
					}}
				>
					{symbol}
				</div>
			</div>,
			{
				width: 630,
				height: 1200,
			},
		);
	} catch (e) {
		const message = e instanceof Error ? e.message : "Unknown error";
		console.error("[token image route]", message);
		return new Response("Failed to generate the image", {
			status: 500,
		});
	}
}
