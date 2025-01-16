// @ts-check

import i18next from 'i18next';

export default (app) => {
  app
    .get('/users', { name: 'users' }, async (req, reply) => {
      const currentUser = req.user;
      console.log(currentUser);
      const users = await app.objection.models.user.query();
      reply.render('users/index', { users, currentUser });
      return reply;
    })
    .get('/users/new', { name: 'newUser' }, (req, reply) => {
      const user = new app.objection.models.user();
      reply.render('users/new', { user });
    })
    .post('/users', async (req, reply) => {
      const user = new app.objection.models.user();
      user.$set(req.body.data);

      try {
        const validUser = await app.objection.models.user.fromJson(req.body.data);
        await app.objection.models.user.query().insert(validUser);
        req.flash('info', i18next.t('flash.users.create.success'));
        reply.redirect(app.reverse('root'));
      } catch ({ data }) {
        req.flash('error', i18next.t('flash.users.create.error'));
        reply.render('users/new', { user, errors: data });
      }

      return reply;
    })
    .get('/users/:id/edit', { name: 'editUser' }, (req, reply) => reply.render('users/edit'))
    .patch('/users/:id', { name: 'patchUser' }, (req, reply) => reply.send({ norm: 'norm' }))
    .delete('/users/:id', { name: 'deleteUser' }, async (req, reply) => {
      const { id } = req.params;
      req.logOut();
      await app.objection.models.user.query().deleteById(id);
      req.flash('info', i18next.t('flash.users.delete.success'));
      return reply.redirect('/users');
    });
};
