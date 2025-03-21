// @ts-check

import { URL } from 'url';
import fs from 'fs';
import path from 'path';

// TODO: использовать для фикстур https://github.com/viglucci/simple-knex-fixtures

const getFixturePath = (filename) => path.join('..', '..', '__fixtures__', filename);
const readFixture = (filename) => fs.readFileSync(new URL(getFixturePath(filename), import.meta.url), 'utf-8').trim();
const getFixtureData = (filename) => JSON.parse(readFixture(filename));

export const getTestData = () => getFixtureData('testData.json');

export const prepareData = async (app) => {
  const { knex } = app.objection;

  // получаем данные из фикстур и заполняем БД
  await knex('users').insert(getFixtureData('users.json'));
  await knex('statuses').insert(getFixtureData('status.json'));
  await knex('labels').insert(getFixtureData('labels.json'));
  await knex('tasks').insert(getFixtureData('tasks.json'));
  await knex('tasks_labels').insert(getFixtureData('taskLabels.json'));
};

export const getSession = async (app) => {
  const params = getFixtureData('session.json');
  await app.objection.knex('users').insert(params.insert);

  const responseSignIn = await app.inject({
    method: 'POST',
    url: app.reverse('session'),
    payload: {
      data: params.login,
    },
  });

  expect(responseSignIn.statusCode).toBe(302);
  // после успешной аутентификации получаем куки из ответа,
  // они понадобятся для выполнения запросов на маршруты требующие
  // предварительную аутентификацию
  const [sessionCookie] = responseSignIn.cookies;
  const { name, value } = sessionCookie;
  const cookie = { [name]: value };
  return cookie;
};
