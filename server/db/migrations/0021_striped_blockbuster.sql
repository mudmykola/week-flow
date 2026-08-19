ALTER TABLE `subtasks` ADD `planned_date` text;--> statement-breakpoint
ALTER TABLE `subtasks` ADD `original_planned_date` text;--> statement-breakpoint
ALTER TABLE `subtasks` ADD `reschedule_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `subtasks_planned_date_idx` ON `subtasks` (`planned_date`,`status`);