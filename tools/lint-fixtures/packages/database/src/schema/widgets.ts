export { app } from "@repo/server"; // expect: repo/workspace-imports
export { APP_NAME } from "@repo/shared";

declare function pgTable(name: string, columns: object): object;
declare function uuid(name?: string): Column;
declare function text(name?: string): Column;
declare function timestamp(name?: string): Column;
interface Column {
  primaryKey(): Column;
  defaultRandom(): Column;
  defaultNow(): Column;
  notNull(): Column;
}

// expect-next-line: repo/table-conventions
export const widgets = pgTable("widgets", {
  id: uuid().primaryKey().defaultRandom(),
  displayName: text().notNull(), // expect: repo/table-conventions
  nickName: text("nickName"), // expect: repo/table-conventions
  shortCode: text("short_code"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// expect-next-line: repo/table-conventions
export const second = pgTable("second", {
  id: uuid().primaryKey().defaultRandom(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
