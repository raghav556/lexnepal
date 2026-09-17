-- R2 Cases domain foundations.
-- Recovery: restore from mysqldump (`npm run local:mysql:backup`). ENUM expansion is not safely undone by a down migration.
-- FORBIDDEN: copy cases.description into client_summary; INSERT into case_parties.
ALTER TABLE `cases`
  ADD `client_summary` longtext,
  ADD `closure_outcome` enum('won','lost','settled','withdrawn','other');
--> statement-breakpoint
ALTER TABLE `cases` MODIFY `status` enum('inquiry','active','on_hold','closed_won','closed_lost','closed') NOT NULL;
--> statement-breakpoint
UPDATE `cases` SET `status` = 'closed', `closure_outcome` = 'won' WHERE `status` = 'closed_won';
--> statement-breakpoint
UPDATE `cases` SET `status` = 'closed', `closure_outcome` = 'lost' WHERE `status` = 'closed_lost';
--> statement-breakpoint
CREATE TABLE `case_parties` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`case_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`side` enum('our_side','opposing','other') NOT NULL,
	`role_label` varchar(255),
	`party_type` enum('person','organisation') NOT NULL,
	`client_id` varchar(36),
	`sort_order` int NOT NULL DEFAULT 0,
	`client_visible` boolean NOT NULL DEFAULT false,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `case_parties_id` PRIMARY KEY(`id`),
	CONSTRAINT `case_parties_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `case_parties_firm_id_id_unique` ON `case_parties` (`firm_id`, `id`);
--> statement-breakpoint
CREATE INDEX `case_parties_case_idx` ON `case_parties` (`firm_id`,`case_id`);
--> statement-breakpoint
CREATE INDEX `case_parties_client_idx` ON `case_parties` (`firm_id`,`client_id`);
--> statement-breakpoint
ALTER TABLE `case_parties` ADD CONSTRAINT `case_parties_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `case_parties` ADD CONSTRAINT `case_parties_case_id_cases_id_fk` FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `case_parties` ADD CONSTRAINT `case_parties_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `case_parties`
  ADD CONSTRAINT `case_parties_case_same_firm_fk` FOREIGN KEY (`firm_id`, `case_id`) REFERENCES `cases` (`firm_id`, `id`),
  ADD CONSTRAINT `case_parties_client_same_firm_fk` FOREIGN KEY (`firm_id`, `client_id`) REFERENCES `clients` (`firm_id`, `id`);
