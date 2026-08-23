ALTER TABLE `sticky_notes` ADD `title` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `sticky_notes` ADD `note_date` text;--> statement-breakpoint
ALTER TABLE `sticky_notes` ADD `pinned` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `sticky_notes` ADD `archived_at` integer;--> statement-breakpoint
ALTER TABLE `sticky_notes` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sticky_notes` ADD `labels` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `sticky_notes` ADD `linked_task_id` text;--> statement-breakpoint
ALTER TABLE `sticky_notes` ADD `completed_at` integer;--> statement-breakpoint
CREATE INDEX `sticky_notes_owner_date_idx` ON `sticky_notes` (`owner_id`,`note_date`,`archived_at`);