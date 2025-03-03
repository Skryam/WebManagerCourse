// @ts-check

export const up = (knex) => (
  knex.schema.createTable('tasks', (table) => {
    table.increments('id').primary();
    table.string('name');
    table.string('description');
    table.integer('status_id');
    table.integer('executor_id').nullable();
    table.integer('creator_id');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  })
);

export const down = (knex) => knex.schema.dropTable('tasks');
