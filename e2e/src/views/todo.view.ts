import { ClientFunction, Selector } from 'testcafe';

import config from '../config';

/**
 * @feature Todo View
 */

fixture('Feature: Todo View').beforeEach(async controller => {
  const path = '/todo';
  await controller.navigateTo(`${config.url}/#${path}`);
  await controller.expect(await controller.eval(() => window.location.href)).contains(path);
});

test('should remember completed todos after page refresh', async controller => {
  await controller.typeText(Selector('input#add-todo'), 'test');
  await controller.click(Selector('button#add-todo'));

  const checkboxes = Selector('#selectTodos mat-list-option');
  const checkboxCount = await checkboxes.count;

  for (let i = 0; i < checkboxCount; i++) {
    const checkBox = checkboxes.nth(i);
    await controller.click(checkBox);
  }

  await controller.wait(300);

  await controller.eval(() => location.reload());

  await controller.expect(Selector('h2#completed-count').innerText).contains(String(checkboxCount));
});

test('should keep menu open after page refresh', async controller => {
  const drawer = Selector('.mat-drawer');

  await controller.expect(drawer.getStyleProperty('visibility')).eql('hidden');

  await controller.click(Selector('button#menu'));
  await controller.eval(() => location.reload());

  await controller.expect(drawer.getStyleProperty('visibility')).eql('visible');
});
