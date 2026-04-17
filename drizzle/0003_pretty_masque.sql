CREATE TYPE "public"."language" AS ENUM('en', 'es', 'ca');--> statement-breakpoint
CREATE TYPE "public"."speed" AS ENUM('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10');--> statement-breakpoint
ALTER TABLE "recipe" ALTER COLUMN "name" SET DATA TYPE varchar(200);--> statement-breakpoint
ALTER TABLE "recipe" ALTER COLUMN "language" SET DEFAULT 'en'::"public"."language";--> statement-breakpoint
ALTER TABLE "recipe" ALTER COLUMN "language" SET DATA TYPE "public"."language" USING "language"::"public"."language";--> statement-breakpoint
ALTER TABLE "recipe_ingredient" ALTER COLUMN "name" SET DATA TYPE varchar(200);--> statement-breakpoint
ALTER TABLE "recipe_step" ALTER COLUMN "description" SET DATA TYPE varchar(1000);--> statement-breakpoint
ALTER TABLE "recipe_step" ALTER COLUMN "speed" SET DEFAULT '0'::"public"."speed";--> statement-breakpoint
ALTER TABLE "recipe_step" ALTER COLUMN "speed" SET DATA TYPE "public"."speed" USING "speed"::"public"."speed";