CREATE TABLE `dailies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_hint` text NOT NULL,
	`day` integer NOT NULL,
	`words` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_hint` text NOT NULL,
	`word` text NOT NULL,
	`context` text,
	`created_at` integer NOT NULL
);
