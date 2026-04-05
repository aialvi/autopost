import {
  decimal,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { brands } from "./core";

export const customExpenses = pgTable(
  "custom_expenses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    frequency: text("frequency", {
      enum: ["one_time", "daily", "weekly", "monthly"],
    }).notNull(),
    startDate: text("start_date") // YYYY-MM-DD format
      .notNull(),
    endDate: text("end_date"), // YYYY-MM-DD format, nullable for ongoing expenses
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("custom_expense_brand_idx").on(table.brandId)]
);

export const customExpensesRelations = relations(customExpenses, ({
  one,
}) => ({
  brand: one(brands, {
    fields: [customExpenses.brandId],
    references: [brands.id],
  }),
}));
