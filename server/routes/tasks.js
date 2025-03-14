// @ts-check

import i18next from 'i18next';

export default (app) => {
  app
    .get('/tasks', { name: 'tasks', preValidation: app.authenticate }, async (req, reply) => {
      const filter = { ...req.query, userId: req.user.id };
      console.log(filter)

      const tasks = await app.objection.models.task.query().withGraphJoined('[status, creator, executor, labels]')
        .skipUndefined()
        .modify('filter', 'statusId', filter.status)
        // .modify('filter', 'executorId', filter.executor)
        // .modify('filter', 'labels.id', filter.label)
        // .modify('filter', 'creatorId', filter.userId)

      const statuses = await app.objection.models.status.query();
      const users = await app.objection.models.user.query();
      const labels = await app.objection.models.label.query();
      console.log(tasks);
      reply
        // .code(200)
        .render('tasks/index', {
          tasks, statuses, users, labels, filter,
        });
      return reply;
    })
    .get('/tasks/new', { name: 'newTask', preValidation: app.authenticate }, async (req, reply) => {
      const task = new app.objection.models.task();
      const statuses = await app.objection.models.status.query();
      const users = await app.objection.models.user.query();
      const labels = await app.objection.models.label.query();
      reply
        // .code(200)
        .render('tasks/new', {
          task, statuses, users, labels,
        });
      return reply;
    })
    .post('/tasks', { preValidation: app.authenticate }, async (req, reply) => {
      console.log('begin');
      const data = { creatorId: req.user.id, ...req.body.data };

      try {
        await app.objection.models.task.transaction(async (trx) => {
          console.log('try');
          const validTask = await app.objection.models.task.fromJson(data);

          const insertTask = await app.objection.models.task.query(trx).insertAndFetch(validTask);
          console.log('iiiiiiiiid', validTask.$id());

          if (data.labels) {
            await Promise.all(
              [...data.labels].flatMap((label) => insertTask.$relatedQuery('labels', trx).relate(label)),
            );
          }
          return insertTask;
        });

        req.flash('info', i18next.t('flash.tasks.create.success'));
        reply
          // .code(201)
          .redirect(app.reverse('tasks'));
      } catch (errors) {
        console.log('error', errors);
        const statuses = await app.objection.models.status.query();
        const users = await app.objection.models.user.query();
        const labels = await app.objection.models.label.query();

        req.flash('error', i18next.t('flash.tasks.create.error'));
        reply.render('tasks/new', {
          task: data, statuses, users, labels, errors: errors.data,
        });
      }

      return reply;
    })
    .get('/tasks/:id', { preValidation: app.authenticate }, async (req, reply) => {
      const task = await app.objection.models.task.query().findById(req.params.id).withGraphFetched('[status, creator, executor, labels]');
      reply
        // .code(200)
        .render('tasks/view', { task });
      return reply;
    })
    .get('/tasks/:id/edit', { preValidation: app.authenticate }, async (req, reply) => {
      const task = await app.objection.models.task.query().findById(req.params.id).withGraphFetched('[status, creator, executor, labels]');
      const statuses = await app.objection.models.status.query();
      const users = await app.objection.models.user.query();
      const labels = await app.objection.models.label.query();
      reply
        // .code(200)
        .render('tasks/edit', {
          task, statuses, users, labels,
        });
      return reply;
    })
    .patch('/tasks/:id', { preValidation: app.authenticate }, async (req, reply) => {
      const { data } = req.body;
      data.statusId = parseInt(data.statusId, 10) || 0;
      data.executorId = parseInt(data.executorId, 10) || null;

      const task = await app.objection.models.task.query().findById(req.params.id).withGraphFetched('[status, creator, executor, labels]');

      try {
        await task.$query().patch(data);
        await task.$relatedQuery('labels').unrelate();
        if (data.labels && data.labels.length > 0) {
          [...data.labels].forEach(async (label) => {
            await task.$relatedQuery('labels').relate(label);
          });
        }
        req.flash('info', i18next.t('flash.tasks.patch.success'));
        reply
          // .code(200)
          .redirect(app.reverse('tasks'));
      } catch (errors) {
        console.log(errors);
        const statuses = await app.objection.models.status.query();
        const users = await app.objection.models.user.query();
        const labels = await app.objection.models.label.query();
        req.flash('error', i18next.t('flash.tasks.patch.error'));
        reply.render('tasks/edit', {
          task, statuses, users, labels, errors: errors.data,
        });
      }

      return reply;
    })
    .delete('/tasks/:id', { preValidation: app.authenticate }, async (req, reply) => {
      const { id } = req.params;
      const task = await app.objection.models.task.query().findById(id);
      if (task.creatorId !== req.user.id) {
        req.flash('error', i18next.t('flash.tasks.delete.error'));
        reply.redirect('/tasks');
      } else {
        await task.$relatedQuery('labels').unrelate();
        await task.$query().delete();
        req.flash('info', i18next.t('flash.tasks.delete.success'));
        reply
          // .code(200)
          .redirect('/tasks');
      }
      return reply;
    });
};
