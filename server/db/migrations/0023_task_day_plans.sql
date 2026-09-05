CREATE TABLE `task_day_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`task_id` text NOT NULL,
	`planned_date` text NOT NULL,
	`planned_time` text,
	`planned_minutes` integer,
	`status` text DEFAULT 'planned' NOT NULL,
	`carryover_reason` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `task_day_plans_task_date_idx` ON `task_day_plans` (`task_id`,`planned_date`);--> statement-breakpoint
CREATE INDEX `task_day_plans_owner_date_idx` ON `task_day_plans` (`owner_id`,`planned_date`,`status`);