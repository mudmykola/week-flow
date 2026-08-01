CREATE TABLE `sticky_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`content` text NOT NULL,
	`color` text DEFAULT 'yellow' NOT NULL,
	`position_x` integer DEFAULT 24 NOT NULL,
	`position_y` integer DEFAULT 24 NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sticky_notes_owner_idx` ON `sticky_notes` (`owner_id`,`updated_at`);