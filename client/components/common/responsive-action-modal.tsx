"use client";

import * as React from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";

const DESKTOP_BREAKPOINT = "(min-width: 768px)";

type ResponsiveActionModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: React.ReactNode;
	children: React.ReactNode;
	/** Optional class for the content area (form/actions container) */
	contentClassName?: string;
};

/**
 * Renders a modal as Dialog on desktop (md+) and as Drawer on mobile.
 * Use for deposit, claim, and other actions from the game detail view.
 */
export function ResponsiveActionModal({
	open,
	onOpenChange,
	title,
	description,
	children,
	contentClassName,
}: ResponsiveActionModalProps) {
	const isDesktop = useMediaQuery(DESKTOP_BREAKPOINT);

	if (isDesktop) {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="sm:max-w-[425px]" showCloseButton>
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
						{description && (
							<DialogDescription>{description}</DialogDescription>
						)}
					</DialogHeader>
					<div className={contentClassName}>{children}</div>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent>
				<DrawerHeader className="text-left">
					<DrawerTitle>{title}</DrawerTitle>
					{description && <DrawerDescription>{description}</DrawerDescription>}
				</DrawerHeader>
				<div className={contentClassName ?? "px-4"}>{children}</div>
				<DrawerFooter className="pt-2">
					<DrawerClose asChild>
						<Button variant="outline">Cancel</Button>
					</DrawerClose>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
