CREATE TABLE `dailies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`playerHint` text NOT NULL,
	`day` integer NOT NULL,
	`words` text NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`playerHint` text NOT NULL,
	`word` text NOT NULL,
	`context` text,
	`createdAt` integer NOT NULL
);
