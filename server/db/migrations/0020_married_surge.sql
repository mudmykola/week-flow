CREATE TABLE `review_progress_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`task_id` text NOT NULL,
	`subtask_id` text,
	`work_date` text NOT NULL,
	`kind` text DEFAULT 'progress' NOT NULL,
	`note` text NOT NULL,
	`minutes` integer,
	`next_step` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subtask_id`) REFERENCES `subtasks`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `review_progress_owner_date_idx` ON `review_progress_entries` (`owner_id`,`work_date`);--> statement-breakpoint
CREATE INDEX `review_progress_task_date_idx` ON `review_progress_entries` (`task_id`,`work_date`);