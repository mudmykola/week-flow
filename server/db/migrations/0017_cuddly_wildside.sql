CREATE INDEX `tasks_owner_created_idx` ON `tasks` (`owner_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `tasks_owner_week_status_idx` ON `tasks` (`owner_id`,`week`,`status`);--> statement-breakpoint
CREATE INDEX `tasks_owner_planned_status_idx` ON `tasks` (`owner_id`,`planned_date`,`status`);--> statement-breakpoint
CREATE INDEX `tasks_owner_reminder_idx` ON `tasks` (`owner_id`,`reminder_at`);