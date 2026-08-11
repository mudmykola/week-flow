ALTER TABLE `tasks` ADD `planned_date` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `planned_time` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `estimate_minutes` integer;--> statement-breakpoint
ALTER TABLE `tasks` ADD `day_rank` integer;--> statement-breakpoint
CREATE INDEX `tasks_planned_date_idx` ON `tasks` (`planned_date`,`day_rank`);