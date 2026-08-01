CREATE TABLE `automation_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`trigger` text NOT NULL,
	`trigger_value` text,
	`action` text NOT NULL,
	`action_value` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `automation_rules_project_idx` ON `automation_rules` (`project_id`);--> statement-breakpoint
CREATE TABLE `workflow_stages` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`category` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`wip_limit` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workflow_stages_project_idx` ON `workflow_stages` (`project_id`,`position`);--> statement-breakpoint
ALTER TABLE `tasks` ADD `assignee_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `tasks` ADD `stage_id` text;--> statement-breakpoint
CREATE INDEX `tasks_assignee_id_idx` ON `tasks` (`assignee_id`);
--> statement-breakpoint
UPDATE `tasks` SET `assignee_id` = `owner_id` WHERE `assignee_id` IS NULL;
