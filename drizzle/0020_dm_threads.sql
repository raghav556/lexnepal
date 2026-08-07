CREATE TABLE "dm_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"user_low_id" uuid NOT NULL,
	"user_high_id" uuid NOT NULL,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "dm_threads_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "dm_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "dm_messages_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "dm_message_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"storage_id" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "dm_message_attachments_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "dm_message_reads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "dm_message_reads_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
ALTER TABLE "dm_threads" ADD CONSTRAINT "dm_threads_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_threads" ADD CONSTRAINT "dm_threads_user_low_id_users_id_fk" FOREIGN KEY ("user_low_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_threads" ADD CONSTRAINT "dm_threads_user_high_id_users_id_fk" FOREIGN KEY ("user_high_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_messages" ADD CONSTRAINT "dm_messages_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_messages" ADD CONSTRAINT "dm_messages_thread_id_dm_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."dm_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_messages" ADD CONSTRAINT "dm_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_message_attachments" ADD CONSTRAINT "dm_message_attachments_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_message_attachments" ADD CONSTRAINT "dm_message_attachments_message_id_dm_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."dm_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_message_reads" ADD CONSTRAINT "dm_message_reads_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_message_reads" ADD CONSTRAINT "dm_message_reads_message_id_dm_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."dm_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_message_reads" ADD CONSTRAINT "dm_message_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dm_threads_pair_unique" ON "dm_threads" USING btree ("firm_id","user_low_id","user_high_id");--> statement-breakpoint
CREATE INDEX "dm_threads_firm_low_idx" ON "dm_threads" USING btree ("firm_id","user_low_id");--> statement-breakpoint
CREATE INDEX "dm_threads_firm_high_idx" ON "dm_threads" USING btree ("firm_id","user_high_id");--> statement-breakpoint
CREATE INDEX "dm_messages_thread_created_idx" ON "dm_messages" USING btree ("firm_id","thread_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "dm_message_attachments_position_unique" ON "dm_message_attachments" USING btree ("firm_id","message_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "dm_message_reads_unique" ON "dm_message_reads" USING btree ("firm_id","message_id","user_id");--> statement-breakpoint
CREATE INDEX "dm_message_reads_user_idx" ON "dm_message_reads" USING btree ("firm_id","user_id");
