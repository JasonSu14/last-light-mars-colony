CREATE TABLE `mission_commands` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`request_id` text NOT NULL,
	`payload` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `mission_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mission_request` ON `mission_commands` (`session_id`,`request_id`);--> statement-breakpoint
CREATE INDEX `mission_queue` ON `mission_commands` (`session_id`,`id`);--> statement-breakpoint
CREATE TABLE `mission_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`mode` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `mission_expiry` ON `mission_sessions` (`expires_at`);