declare function pgTable(name: string, columns: object): object;
declare function uuid(name?: string): Column;
declare function timestamp(name?: string): Column;
interface Column {
  primaryKey(): Column;
  defaultRandom(): Column;
  defaultNow(): Column;
  notNull(): Column;
}

export const good = pgTable("good", {
  id: uuid().primaryKey().defaultRandom(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
