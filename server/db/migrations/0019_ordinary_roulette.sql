ALTER TABLE `goals` ADD `priority` text DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE `goals` ADD `labels` text DEFAULT '[]' NOT NULL;