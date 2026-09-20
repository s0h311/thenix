CREATE TABLE "day_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_id" uuid NOT NULL,
	"note" text NOT NULL,
	"logged_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "day_log_day_unique" UNIQUE("day_id")
);
--> statement-breakpoint
ALTER TABLE "day_log" ADD CONSTRAINT "day_log_day_id_day_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."day"("id") ON DELETE cascade ON UPDATE no action;