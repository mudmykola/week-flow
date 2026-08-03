CREATE TABLE `focus_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`task_id` text,
	`kind` text DEFAULT 'focus' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`planned_seconds` integer NOT NULL,
	`elapsed_seconds` integer DEFAULT 0 NOT NULL,
	`note` text,
	`result` text,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `focus_sessions_owner_started_idx` ON `focus_sessions` (`owner_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `focus_sessions_owner_status_idx` ON `focus_sessions` (`owner_id`,`status`);