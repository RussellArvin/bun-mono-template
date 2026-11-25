import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Example table showing the conventions that `repo/table-conventions` lints:
// one table per file, the three standard columns, and snake_case column names
// in the database. Replace it with your own tables.
export const notes = pgTable("notes", {
  id: uuid().primaryKey().defaultRandom(),
  body: text().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
