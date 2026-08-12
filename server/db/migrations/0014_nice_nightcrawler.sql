CREATE TABLE `daily_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`user_id` text NOT NULL,
	`review_date` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`structured_content` text DEFAULT '{}' NOT NULL,
	`excluded_task_ids` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`submitted_at` integer,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `daily_reviews_owner_date_idx` ON `daily_reviews` (`owner_id`,`review_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `daily_reviews_user_date_idx` ON `daily_reviews` (`user_id`,`review_date`);--> statement-breakpoint
ALTER TABLE `subtasks` ADD `done_at` integer;