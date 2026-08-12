ALTER TABLE `tasks` ADD `work_state` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `waiting_for` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `waiting_until` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `reviewer_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `tasks` ADD `review_note` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `review_requested_at` integer;--> statement-breakpoint
ALTER TABLE `tasks` ADD `approved_at` integer;--> statement-breakpoint
ALTER TABLE `tasks` ADD `actual_minutes` integer;--> statement-breakpoint
ALTER TABLE `tasks` ADD `carryover_reason` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `reschedule_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `original_planned_date` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `ready_criteria` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `done_criteria` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `reminder_at` integer;--> statement-breakpoint
CREATE INDEX `tasks_work_state_idx` ON `tasks` (`work_state`,`waiting_until`);--> statement-breakpoint
CREATE INDEX `tasks_reviewer_idx` ON `tasks` (`reviewer_id`,`work_state`);--> statement-breakpoint
CREATE INDEX `tasks_reminder_idx` ON `tasks` (`reminder_at`);