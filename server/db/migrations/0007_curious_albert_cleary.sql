ALTER TABLE `subtasks` ADD `note` text;--> statement-breakpoint
ALTER TABLE `subtasks` ADD `status` text DEFAULT 'todo' NOT NULL;--> statement-breakpoint
ALTER TABLE `subtasks` ADD `priority` text DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE `subtasks` ADD `due_date` text;--> statement-breakpoint
ALTER TABLE `subtasks` ADD `assignee_id` text REFERENCES users(id);--> statement-breakpoint
CREATE INDEX `subtasks_assignee_id_idx` ON `subtasks` (`assignee_id`);