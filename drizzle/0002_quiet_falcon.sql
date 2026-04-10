CREATE TABLE "cecotec_credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"encrypted_password" text NOT NULL,
	"cecotec_user_id" text,
	"created_at" timestamp (6) with time zone NOT NULL,
	"updated_at" timestamp (6) with time zone NOT NULL,
	CONSTRAINT "cecotec_credentials_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "recipe" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"servings" text DEFAULT '2' NOT NULL,
	"cooking_time" integer NOT NULL,
	"language" varchar(10) DEFAULT 'en' NOT NULL,
	"image_url" text,
	"cecotec_recipe_id" text,
	"cecotec_number" text,
	"sync_status" text DEFAULT 'pending' NOT NULL,
	"sync_error" text,
	"synced_at" timestamp (6) with time zone,
	"created_at" timestamp (6) with time zone NOT NULL,
	"updated_at" timestamp (6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredient" (
	"id" text PRIMARY KEY NOT NULL,
	"recipe_id" text NOT NULL,
	"sort_order" integer NOT NULL,
	"name" text NOT NULL,
	"amount" text NOT NULL,
	"unit" text NOT NULL,
	"cecotec_ingredient_id" text,
	"cecotec_unit_id" text
);
--> statement-breakpoint
CREATE TABLE "recipe_step" (
	"id" text PRIMARY KEY NOT NULL,
	"recipe_id" text NOT NULL,
	"sort_order" integer NOT NULL,
	"description" text NOT NULL,
	"operation_type" integer NOT NULL,
	"total_time" integer DEFAULT 0 NOT NULL,
	"speed" varchar(2) DEFAULT '0' NOT NULL,
	"temperature" integer DEFAULT 0 NOT NULL,
	"power" integer DEFAULT 0 NOT NULL,
	"image_url" text,
	"video_url" text
);
--> statement-breakpoint
ALTER TABLE "cecotec_credentials" ADD CONSTRAINT "cecotec_credentials_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredient" ADD CONSTRAINT "recipe_ingredient_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_step" ADD CONSTRAINT "recipe_step_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE cascade ON UPDATE no action;