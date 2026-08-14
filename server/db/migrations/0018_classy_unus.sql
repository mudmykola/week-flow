CREATE TABLE `reminder_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`task_id` text NOT NULL,
	`scheduled_at` integer NOT NULL,
	`delivered_at` integer NOT NULL,
	`read_at` integer,
	`dismissed_at` integer,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reminder_delivery_task_schedule_idx` ON `reminder_deliveries` (`task_id`,`scheduled_at`);--> statement-breakpoint
CREATE INDEX `reminder_delivery_owner_unread_idx` ON `reminder_deliveries` (`owner_id`,`read_at`,`delivered_at`);