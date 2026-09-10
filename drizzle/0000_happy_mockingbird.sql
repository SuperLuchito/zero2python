CREATE TABLE `progress` (
	`profile` text NOT NULL,
	`kind` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`profile`, `kind`, `key`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`profile` text NOT NULL,
	`expires` text NOT NULL
);
