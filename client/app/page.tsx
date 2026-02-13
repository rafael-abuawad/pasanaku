"use client";

import { EmptyView } from "@/components/pasanaku/empty-view";
import { useUserTokenIds } from "@/hooks/use-user-token-ids";
import { OngoingGamesList } from "@/components/pasanaku/ongoing-games-list";
import { useConnection } from "wagmi";

export default function HomePage() {
	const { address } = useConnection();
	const { tokenIds, isLoading } = useUserTokenIds(address ?? undefined);

	const showEmpty = !address || (!isLoading && tokenIds.length === 0);

	return (
		<main className="min-h-[calc(100vh-16rem)]">
			{showEmpty ? (
				<EmptyView />
			) : (
				<OngoingGamesList tokenIds={tokenIds} isLoading={isLoading} />
			)}
		</main>
	);
}
