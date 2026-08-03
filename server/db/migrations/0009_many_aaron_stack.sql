CREATE TABLE `automation_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`rule_id` text,
	`task_id` text,
	`status` text NOT NULL,
	`trigger` text NOT NULL,
	`changes` text DEFAULT '{}' NOT NULL,
	`error` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`rule_id`) REFERENCES `automation_rules`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `automation_execution_owner_created_idx` ON `automation_executions` (`owner_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `automation_rules` ADD `conditions` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `automation_rules` ADD `actions` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `workflow_stages` ADD `wip_policy` text DEFAULT 'warn' NOT NULL;