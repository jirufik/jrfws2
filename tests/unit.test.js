const {JRFWSServer, JRFWSClient} = require('../index');

let jrfSrv;

beforeEach(() => {

  jrfSrv = new JRFWSServer();

});

describe('generate id', () => {

  test('generate id return string 30-32 chars', () => {

    const uid = jrfSrv._generateId();
    expect(typeof uid).toEqual('string');
    expect(30 <= uid.length).toEqual(true);
    expect(uid.length <= 32).toEqual(true);

  });

  test('generate id uids not equal', () => {

    const uid = jrfSrv._generateId();
    const uid1 = jrfSrv._generateId();

    expect(uid).not.toEqual(uid1);

  });

});

describe('wait', () => {

  test('wait default 1000 ms', async () => {

    const start = new Date();
    await jrfSrv._wait();
    const end = new Date();
    const diff = end - start;

    expect(1000 <= diff && diff <= 1100).toBeTruthy();

  });

  test('wait 100 ms', async () => {

    const start = new Date();
    await jrfSrv._wait(100);
    const end = new Date();
    const diff = end - start;

    expect(99 <= diff).toEqual(true);
    expect(diff <= 130).toEqual(true);

  });

});

describe('process routing', () => {

  test('no callback, no await res, data without uid', async () => {

    const uid = jrfSrv._generateId();
    const data = {uid};
    const res = await jrfSrv._processRoutingRes({data});

    expect(res).toBeTruthy();

  });

  test('no callback, no await res, data with uid', async () => {

    const uid = jrfSrv._generateId();
    const data = {uid};
    const res = await jrfSrv._processRoutingRes({data});

    expect(res).toBeTruthy();

  });

  test('callback is not function', async () => {

    const uid = jrfSrv._generateId();
    const data = {uid};
    jrfSrv._uids[uid] = {callback: {a: 'sss'}};

    const res = await jrfSrv._processRoutingRes({data});

    expect(res).toBeTruthy();

  });

  test('callback', async () => {

    const uid = jrfSrv._generateId();
    const data = {uid};
    jrfSrv._uids[uid] = {
      callback: async () => {
      }
    };

    const res = await jrfSrv._processRoutingRes({data});

    expect(res).toBeFalsy();
    expect(jrfSrv._uids[uid]).toBeUndefined();

  });

  test('await res', async () => {

    const uid = jrfSrv._generateId();
    const data = {uid, data: 1};
    jrfSrv._uids[uid] = {
      res: null,
      gotAnswer: false,
      awaitRes: true
    };

    const res = await jrfSrv._processRoutingRes({data});

    expect(res).toBeFalsy();
    expect(jrfSrv._uids[uid].res).toEqual(1);
    expect(jrfSrv._uids[uid].gotAnswer).toBeTruthy();

  });

});

describe('add route', () => {

  test('func is not function', async () => {

    let err;

    try {
      await jrfSrv.route({func: null});
    } catch (error) {
      err = error;
    }

    expect(err.message).toEqual('Invalid func');

  });

  test('add not found', async () => {

    jrfSrv._routes = [];
    const func = function () {
    };
    await jrfSrv.route({func, route: 'not found'});

    expect(jrfSrv._routes.length).toEqual(0);
    expect(jrfSrv._routeNotFound).toEqual(func);

  });

  test('route', async () => {

    jrfSrv._routes = [];
    const func = function () {
    };
    const route = 'route';
    const act = 'act';
    await jrfSrv.route({func, route, act});

    expect(jrfSrv._routes.length).toEqual(1);
    expect(jrfSrv._routes[0].fn).toEqual(func);
    expect(jrfSrv._routes[0].route).toEqual(route);
    expect(jrfSrv._routes[0].act).toEqual(act);

  });


});

describe('parse message', () => {

  test('mes is not object', async () => {

    const res = await jrfSrv._parseMessage(1);
    expect(res).toBeFalsy();

  });

  test('mes not have data, route, act', async () => {

    const mes = {};

    const res = await jrfSrv._parseMessage(mes);

    expect(res).toBeFalsy();

  });

  test('route is not string', async () => {

    const mes = {route: 1};

    const res = await jrfSrv._parseMessage(mes);

    expect(res).toBeFalsy();

  });

  test('act is not string', async () => {

    const mes = {act: 1};

    const res = await jrfSrv._parseMessage(mes);

    expect(res).toBeFalsy();

  });

  test('mes is valid object', async () => {

    const mes = {route: 'route', act: 'act', data: 'data'};

    const res = await jrfSrv._parseMessage(mes);

    expect(mes).toEqual(res);

  });

  test('mes is valid json object', async () => {

    const mes = JSON.stringify({route: 'route', act: 'act', data: 'data'});

    const res = await jrfSrv._parseMessage(mes);

    expect(mes).toEqual(JSON.stringify(res));

  });


});

describe('process broadcast to', () => {

  test('to is not object', async () => {

    const to = 1;
    const mes = 1;

    const res = await jrfSrv._processBroadcastTo({to, mes});

    expect(res).toBeFalsy();

  });

  test('groups is string', async () => {

    const to = {groups: 'hello'};
    const mes = {};

    const res = await jrfSrv._processBroadcastTo({to, mes});

    expect(res).toBeTruthy();
    expect(mes.to.groups.length).toEqual(1);
    expect(mes.to.groups[0]).toEqual('hello');

  });

  test('groups is array', async () => {

    const to = {groups: ['hello', 'world']};
    const mes = {};

    const res = await jrfSrv._processBroadcastTo({to, mes});

    expect(res).toBeTruthy();
    expect(mes.to.groups.length).toEqual(2);
    expect(mes.to.groups[0]).toEqual('hello');
    expect(mes.to.groups[1]).toEqual('world');

  });

  test('exclude groups is string', async () => {

    const to = {excludeGroups: 'hello'};
    const mes = {};

    const res = await jrfSrv._processBroadcastTo({to, mes});

    expect(res).toBeTruthy();
    expect(mes.to.excludeGroups.length).toEqual(1);
    expect(mes.to.excludeGroups[0]).toEqual('hello');

  });

  test('exclude groups is array', async () => {

    const to = {excludeGroups: ['hello', 'world']};
    const mes = {};

    const res = await jrfSrv._processBroadcastTo({to, mes});

    expect(res).toBeTruthy();
    expect(mes.to.excludeGroups.length).toEqual(2);
    expect(mes.to.excludeGroups[0]).toEqual('hello');
    expect(mes.to.excludeGroups[1]).toEqual('world');

  });

  test('users is string', async () => {

    const to = {users: 'hello'};
    const mes = {};

    const res = await jrfSrv._processBroadcastTo({to, mes});

    expect(res).toBeTruthy();
    expect(mes.to.users.length).toEqual(1);
    expect(mes.to.users[0]).toEqual('hello');

  });

  test('users is array', async () => {

    const to = {users: ['hello', 'world']};
    const mes = {};

    const res = await jrfSrv._processBroadcastTo({to, mes});

    expect(res).toBeTruthy();
    expect(mes.to.users.length).toEqual(2);
    expect(mes.to.users[0]).toEqual('hello');
    expect(mes.to.users[1]).toEqual('world');

  });

  test('exclude users is string', async () => {

    const to = {excludeUsers: 'hello'};
    const mes = {};

    const res = await jrfSrv._processBroadcastTo({to, mes});

    expect(res).toBeTruthy();
    expect(mes.to.excludeUsers.length).toEqual(1);
    expect(mes.to.excludeUsers[0]).toEqual('hello');

  });

  test('exclude users is array', async () => {

    const to = {excludeUsers: ['hello', 'world']};
    const mes = {};

    const res = await jrfSrv._processBroadcastTo({to, mes});

    expect(res).toBeTruthy();
    expect(mes.to.excludeUsers.length).toEqual(2);
    expect(mes.to.excludeUsers[0]).toEqual('hello');
    expect(mes.to.excludeUsers[1]).toEqual('world');

  });

  test('me too true', async () => {

    const to = {meToo: true};
    const mes = {};

    const res = await jrfSrv._processBroadcastTo({to, mes});

    expect(res).toBeTruthy();
    expect(mes.to.meToo).toBeTruthy();

  });

  test('me too false', async () => {

    const to = {};
    const mes = {};

    const res = await jrfSrv._processBroadcastTo({to, mes});

    expect(res).toBeTruthy();
    expect(mes.to.meToo).toBeFalsy();

  });

});

describe('add group server', () => {

  test('group is not object', async () => {

    const mes = {};
    const sender = {};
    const group = 'rick and morty';

    const res = await jrfSrv._addGroupServer({mes, sender, group});

    expect(res).toBeFalsy();

  });

  test('group is not name', async () => {

    const mes = {};
    const sender = {};
    const group = {};

    const res = await jrfSrv._addGroupServer({mes, sender, group});

    expect(res).toBeFalsy();

  });

  test('add group shitman', async () => {

    const mes = {};
    const sender = {};
    const group = {name: 'shitman'};

    const res = await jrfSrv._addGroupServer({mes, sender, group});

    expect(res).toBeTruthy();
    expect(jrfSrv.groups.shitman).toMatchObject({name: 'shitman', description: '', users: []});

  });

  test('add groups rick and morty', async () => {

    const mes = {};
    const sender = {};
    const group = [{name: 'rick'}, {name: 'morty'}];

    const res = await jrfSrv._addGroupServer({mes, sender, group});

    expect(res).toBeTruthy();
    expect(jrfSrv.groups.rick).toMatchObject({name: 'rick', description: '', users: []});
    expect(jrfSrv.groups.morty).toMatchObject({name: 'morty', description: '', users: []});

  });

  test('on before', async () => {

    const mes = {};
    const sender = {};
    const group = [{name: 'rick'}, {name: 'morty'}];

    jrfSrv.onBeforeAddGroup = ({mes, sender, group}) => {
      mes.test = true;
      sender.test = true;
      group.pop();
      return false;
    };

    const res = await jrfSrv._addGroupServer({mes, sender, group});

    expect(res).toBeFalsy();
    expect(group.length).toEqual(1);
    expect(mes.test).toBeTruthy();
    expect(sender.test).toBeTruthy();

  });

  test('on after', async () => {

    const mes = {};
    const sender = {};
    const group = [{name: 'rick'}, {name: 'morty'}];

    jrfSrv.onAfterAddGroup = ({mes, sender, group}) => {
      mes.test = true;
      sender.test = true;
      group.pop();
      return false;
    };

    const res = await jrfSrv._addGroupServer({mes, sender, group});

    expect(res).toBeFalsy();
    expect(group.length).toEqual(1);
    expect(mes.test).toBeTruthy();
    expect(sender.test).toBeTruthy();

  });

});

describe('del group server', () => {

  test('group is not found', async () => {

    const mes = {};
    const sender = {};
    const group = 'rick and morty';

    const res = await jrfSrv._delGroupServer({mes, sender, group});

    expect(res).toBeFalsy();

  });

  test('del group rick', async () => {

    const mes = {};
    const sender = {};
    const group = 'rick';

    jrfSrv.groups.rick = {
      name: 'rick',
      description: '',
      users: []
    };

    jrfSrv.groups.morty = {
      name: 'morty',
      description: '',
      users: []
    };

    const res = await jrfSrv._delGroupServer({mes, sender, group});

    expect(res).toBeTruthy();
    expect(jrfSrv.groups.morty).toMatchObject({
      name: 'morty',
      description: '',
      users: []
    });

  });

  test('del group morty', async () => {

    const mes = {};
    const sender = {};
    const group = {name: 'morty'};

    jrfSrv.groups.rick = {
      name: 'rick',
      description: '',
      users: []
    };

    jrfSrv.groups.morty = {
      name: 'morty',
      description: '',
      users: []
    };

    const res = await jrfSrv._delGroupServer({mes, sender, group});

    expect(res).toBeTruthy();
    expect(jrfSrv.groups.rick).toMatchObject({
      name: 'rick',
      description: '',
      users: []
    });

  });

  test('del groups rick and morty', async () => {

    const mes = {};
    const sender = {};
    const group = [{name: 'morty'}, 'morty'];

    jrfSrv.groups.rick = {
      name: 'rick',
      description: '',
      users: []
    };

    jrfSrv.groups.morty = {
      name: 'morty',
      description: '',
      users: []
    };

    const res = await jrfSrv._delGroupServer({mes, sender, group});

    expect(res).toBeTruthy();
    expect(jrfSrv.groups).toMatchObject({});

  });

  test('on before', async () => {

    const mes = {};
    const sender = {};
    const group = [{name: 'morty'}, 'rick'];

    jrfSrv.onBeforeDelGroup = ({mes, sender, group}) => {
      mes.test = true;
      sender.test = true;
      return false;
    };

    jrfSrv.groups.rick = {
      name: 'rick',
      description: '',
      users: []
    };

    jrfSrv.groups.morty = {
      name: 'morty',
      description: '',
      users: []
    };

    const res = await jrfSrv._delGroupServer({mes, sender, group});

    expect(res).toBeFalsy();
    expect(mes.test).toBeTruthy();
    expect(sender.test).toBeTruthy();
    expect(jrfSrv.groups.rick).toMatchObject({
      name: 'rick',
      description: '',
      users: []
    });
    expect(jrfSrv.groups.morty).toMatchObject({
      name: 'morty',
      description: '',
      users: []
    });

  });

  test('on after', async () => {

    const mes = {};
    const sender = {};
    const group = [{name: 'morty'}, 'rick'];

    jrfSrv.onAfterDelGroup = ({mes, sender, group}) => {
      mes.test = true;
      sender.test = true;
      return false;
    };

    jrfSrv.groups.rick = {
      name: 'rick',
      description: '',
      users: []
    };

    jrfSrv.groups.morty = {
      name: 'morty',
      description: '',
      users: []
    };

    const res = await jrfSrv._delGroupServer({mes, sender, group});

    expect(res).toBeTruthy();
    expect(mes.test).toBeTruthy();
    expect(sender.test).toBeTruthy();
    expect(jrfSrv.groups).toMatchObject({});

  });

});

describe('add user to group server', () => {

  beforeEach(() => {

    jrfSrv.groups = {
      rick: {
        name: 'rick',
        description: 'rick',
        users: []
      },
      morty: {
        name: 'morty',
        description: 'morty',
        users: []
      },
    };

    jrfSrv.wss = {
      clients: ['client']
    }

  });

  test('group not found', async () => {

    const mes = {test: false};
    const sender = {test: false};
    const group = 'shitman';
    const user = {username: 'shitman'};

    const res = await jrfSrv._addUserToGroupServer({mes, sender, group, user});

    expect(res).toBeFalsy();

  });

  test('user already exists', async () => {

    const mes = {test: false};
    const sender = {test: false};
    const group = 'rick';
    const user = {username: 'shitman'};
    jrfSrv.groups.rick.users = ['shitman'];

    const res = await jrfSrv._addUserToGroupServer({mes, sender, group, user});

    expect(res).toBeFalsy();
    expect(jrfSrv.groups.rick.users.length).toEqual(1);
    expect(jrfSrv.groups.rick.users[0]).toEqual('shitman');

  });

  test('add user', async () => {

    const mes = {test: false};
    const sender = {test: false};
    const group = 'rick';
    const user = {username: 'shitman'};

    const res = await jrfSrv._addUserToGroupServer({mes, sender, group, user});

    expect(res).toBeTruthy();
    expect(jrfSrv.groups.rick.users.length).toEqual(1);
    expect(jrfSrv.groups.rick.users[0]).toMatchObject(user);

  });

  test('on before', async () => {

    const mes = {test: false};
    const sender = {test: false};
    const group = {name: 'rick'};
    const user = {username: 'shitman'};
    let testGroup = {};

    jrfSrv.onBeforeAddUserToGroup = ({mes, sender, group, user}) => {
      mes.test = true;
      sender.test = true;
      testGroup = group;
      user.test = true;
      return false;
    };

    const res = await jrfSrv._addUserToGroupServer({mes, sender, group, user});

    expect(res).toBeFalsy();
    expect(jrfSrv.groups.rick.users.length).toEqual(0);
    expect(mes.test).toBeTruthy();
    expect(sender.test).toBeTruthy();
    expect(testGroup).toMatchObject(jrfSrv.groups.rick);
    expect(user.test).toBeTruthy();

  });

  test('on after', async () => {

    const mes = {test: false};
    const sender = {test: false};
    const group = {name: 'rick'};
    const user = {username: 'shitman'};
    let testGroup = {};

    jrfSrv.onAfterAddUserToGroup = ({mes, sender, group, user}) => {
      mes.test = true;
      sender.test = true;
      testGroup = group;
      user.test = true;
    };

    const res = await jrfSrv._addUserToGroupServer({mes, sender, group, user});

    expect(res).toBeTruthy();
    expect(jrfSrv.groups.rick.users.length).toEqual(1);
    expect(mes.test).toBeTruthy();
    expect(sender.test).toBeTruthy();
    expect(testGroup).toMatchObject(jrfSrv.groups.rick);
    expect(user.test).toBeTruthy();

  });

});

describe('add user to group server', () => {

  beforeEach(() => {

    jrfSrv.groups = {
      rick: {
        name: 'rick',
        description: 'rick',
        users: ['rick', 'morty', 'mr. shitman']
      },
      morty: {
        name: 'morty',
        description: 'morty',
        users: []
      },
    };

    jrfSrv.wss = {
      clients: ['client']
    }

  });

  test('group not found', async () => {

    const mes = {test: false};
    const sender = {test: false};
    const group = {name: 'shitman'};
    const user = {username: 'shitman'};

    const res = await jrfSrv._delUserToGroupServer({mes, sender, group, user});

    expect(res).toBeFalsy();

  });

  test('user not found', async () => {

    const mes = {test: false};
    const sender = {test: false};
    const group = {name: 'rick'};
    const user = {username: 'shitman'};

    const res = await jrfSrv._delUserToGroupServer({mes, sender, group, user});

    expect(res).toBeFalsy();
    expect(jrfSrv.groups.rick.users.length).toEqual(3);
    expect(jrfSrv.groups.rick.users[2]).toEqual('mr. shitman');

  });

  test('del user', async () => {

    const mes = {test: false};
    const sender = {test: false};
    const group = {name: 'rick'};
    const user = {username: 'morty'};

    const res = await jrfSrv._delUserToGroupServer({mes, sender, group, user});

    expect(res).toBeTruthy();
    expect(jrfSrv.groups.rick.users).toMatchObject(['rick', 'mr. shitman']);

  });

  test('on before', async () => {

    const mes = {test: false};
    const sender = {test: false};
    const group = {name: 'rick'};
    const user = {username: 'morty'};
    let testGroup = {};

    jrfSrv.onBeforeDelUserToGroup = ({mes, sender, group, user}) => {
      mes.test = true;
      sender.test = true;
      testGroup = group;
      user.test = true;
      return false;
    };

    const res = await jrfSrv._delUserToGroupServer({mes, sender, group, user});

    expect(res).toBeFalsy();
    expect(jrfSrv.groups.rick.users).toMatchObject(['rick', 'morty', 'mr. shitman']);
    expect(jrfSrv.groups.rick).toMatchObject(testGroup);
    expect(mes.test).toBeTruthy();
    expect(sender.test).toBeTruthy();
    expect(user.test).toBeTruthy();

  });

  test('on after', async () => {

    const mes = {test: false};
    const sender = {test: false};
    const group = {name: 'rick'};
    const user = {username: 'morty'};
    let testGroup = {};

    jrfSrv.onAfterDelUserToGroup = ({mes, sender, group, user}) => {
      mes.test = true;
      sender.test = true;
      testGroup = group;
      user.test = true;
      return false;
    };

    const res = await jrfSrv._delUserToGroupServer({mes, sender, group, user});

    expect(res).toBeTruthy();
    expect(jrfSrv.groups.rick.users).toMatchObject(['rick', 'mr. shitman']);
    expect(jrfSrv.groups.rick).toMatchObject(testGroup);
    expect(mes.test).toBeTruthy();
    expect(sender.test).toBeTruthy();
    expect(user.test).toBeTruthy();

  });

});

describe('get groups server', () => {

  beforeEach(() => {

    jrfSrv.groups = {
      rick: {
        name: 'rick',
        description: 'rick',
        users: ['rick', 'morty', 'mr. shitman']
      },
      morty: {
        name: 'morty',
        description: 'morty',
        users: []
      },
    };

    jrfSrv.wss = {
      clients: ['client']
    }

  });

  test('get', async () => {

    const mes = {test: false};
    const sender = {test: false};
    const groups = {
      rick: {
        name: 'rick',
        description: 'rick',
        users: ['rick', 'morty', 'mr. shitman']
      },
      morty: {
        name: 'morty',
        description: 'morty',
        users: []
      },
    };

    const res = await jrfSrv._getGroupsServer({mes, sender});

    expect(res).toMatchObject(groups);

  });

  test('on before', async () => {

    const mes = {test: false};
    const sender = {test: false};

    jrfSrv.onBeforeGetGroups = ({mes, sender}) => {
      mes.test = true;
      sender.test = true;
      return false;
    };

    const res = await jrfSrv._getGroupsServer({mes, sender});

    expect(res).toBeFalsy();
    expect(mes.test).toBeTruthy();
    expect(sender.test).toBeTruthy();

  });

  test('on after', async () => {

    const mes = {test: false};
    const sender = {test: false};
    const groups = {
      rick: {
        name: 'rick',
        description: 'rick',
        users: ['rick', 'morty', 'mr. shitman']
      },
      morty: {
        name: 'morty',
        description: 'morty',
        users: ['morty']
      },
    };

    jrfSrv.onAfterGetGroups = ({mes, sender, groups}) => {
      mes.test = true;
      sender.test = true;
      groups.morty.users = ['morty'];
    };

    const res = await jrfSrv._getGroupsServer({mes, sender});

    expect(res).toMatchObject(groups);
    expect(mes.test).toBeTruthy();
    expect(sender.test).toBeTruthy();

  });

});

describe('get group', () => {

  beforeEach(() => {

    jrfSrv.groups = {
      rick: {
        name: 'rick',
        description: 'rick',
        users: ['rick', 'morty', 'mr. shitman']
      },
      morty: {
        name: 'morty',
        description: 'morty',
        users: []
      },
    };

  });

  test('group is null', () => {

    const group = null;

    const res = jrfSrv._getGroup({group});

    expect(res).toBeFalsy();

  });

  test('group is string', () => {

    const group = 'morty';
    const morty = {
      name: 'morty',
      description: 'morty',
      users: []
    };

    const res = jrfSrv._getGroup({group});

    expect(res).toMatchObject(morty);

  });

  test('group is object', () => {

    const morty = {
      name: 'morty',
      description: 'morty',
      users: []
    };
    const group = morty;

    const res = jrfSrv._getGroup({group});

    expect(res).toMatchObject(morty);

  });

  test('group not found', () => {

    const group = 'mr. shitman';

    const res = jrfSrv._getGroup({group});

    expect(res).toBeFalsy();

  });

});

describe('get user group', () => {

  beforeEach(() => {

    jrfSrv.groups = {
      rick: {
        name: 'rick',
        description: 'rick',
        users: ['rick', 'morty', 'mr. shitman']
      },
      morty: {
        name: 'morty',
        description: 'morty',
        users: []
      },
    };

  });

  test('invalid group', () => {

    const group = {};
    const user = 'rick';

    const res = jrfSrv._getUserGroup({group, user});

    expect(res).toBeFalsy();

  });

  test('user found in group (user is string)', () => {

    const group = jrfSrv.groups.rick;
    const user = 'rick';

    const res = jrfSrv._getUserGroup({group, user});

    expect(res).toMatchObject({groupUser: 'rick', index: 0});

  });

  test('user found in group (user is object)', () => {

    const group = jrfSrv.groups.rick;
    const user = {username: 'rick'};

    const res = jrfSrv._getUserGroup({group, user});

    expect(res).toMatchObject({groupUser: 'rick', index: 0});

  });

  test('user not found in group', () => {

    const group = jrfSrv.groups.rick;
    const user = {username: 'not found'};

    const res = jrfSrv._getUserGroup({group, user});

    expect(res).toBeFalsy();

  });


});

describe('user is matched', () => {

  test('Is matched, matchedUser is string, user is string', () => {

    const user = 'rick';
    const matchedUser = 'Rick';

    const res = jrfSrv._userIsMatched({matchedUser, user});

    expect(res).toBeTruthy();

  });

  test('Is not matched, matchedUser is string, user is string', () => {

    const user = 'mr. shitman';
    const matchedUser = 'Rick';

    const res = jrfSrv._userIsMatched({matchedUser, user});

    expect(res).toBeFalsy();

  });

  test('Is matched, matchedUser is string, user is object', () => {

    const user = {username: 'rick'};
    const matchedUser = 'Rick';

    const res = jrfSrv._userIsMatched({matchedUser, user});

    expect(res).toBeTruthy();

  });

  test('Is not matched, matchedUser is string, user is object', () => {

    const user = {username: 'mr. shitman'};
    const matchedUser = 'Rick';

    const res = jrfSrv._userIsMatched({matchedUser, user});

    expect(res).toBeFalsy();

  });

  test('Is matched, matchedUser is object, user is string', () => {

    const user = 'rick';
    const matchedUser = {username: 'Rick'};

    const res = jrfSrv._userIsMatched({matchedUser, user});

    expect(res).toBeTruthy();

  });

  test('Is matched, matchedUser is object, user is string', () => {

    const user = 'rick';
    const matchedUser = {username: 'Rick'};

    const res = jrfSrv._userIsMatched({matchedUser, user});

    expect(res).toBeTruthy();

  });

  test('Is not matched, matchedUser is object, user is string', () => {

    const user = 'mr. shitman';
    const matchedUser = {username: 'Rick'};

    const res = jrfSrv._userIsMatched({matchedUser, user});

    expect(res).toBeFalsy();

  });

  test('Is matched, matchedUser is object, user is object', () => {

    const user = {username: 'rick', email: 'r@r.r'};
    const matchedUser = {username: 'Rick'};

    const res = jrfSrv._userIsMatched({matchedUser, user});

    expect(res).toBeTruthy();

  });

  test('Is not matched, matchedUser is object, user is object', () => {

    const user = {username: 'mr. shitman', email: 'mr@r.r'};
    const matchedUser = {username: 'Rick'};

    const res = jrfSrv._userIsMatched({matchedUser, user});

    expect(res).toBeFalsy();

  });

});

describe('get routes', () => {

  test('routes', async () => {

    const routes = [
      {
        route: 'morty',
        acts: [
          'add'
        ]
      },
      {
        route: 'rick',
        acts: [
          'add'
        ]
      },
      {
        route: 'groupRickAndMorty',
        acts: [
          'add',
          'del'
        ]
      },
      {
        route: 'groupRick',
        acts: [
          'add'
        ]
      },
      {
        route: 'groupMorty',
        acts: [
          'add'
        ]
      }
    ];

    jrfSrv._routes = [];

    await Promise.all([
      jrfSrv.route({
        route: 'morty', act: 'add', func: () => {
        }
      }),
      jrfSrv.route({
        route: 'rick', act: 'add', func: () => {
        }
      }),
      jrfSrv.route({
        route: 'groupRickAndMorty', act: 'add', func: () => {
        }
      }),
      jrfSrv.route({
        route: 'groupRickAndMorty', act: 'del', func: () => {
        }
      }),
      jrfSrv.route({
        route: 'groupRick', act: 'add', func: () => {
        }
      }),
      jrfSrv.route({
        route: 'groupMorty', act: 'add', func: () => {
        }
      })
    ]);

    const res = await jrfSrv.getRoutes();

    expect(res).toMatchObject(routes);

  });

});

describe('await res', () => {

  test('uid is null', async () => {

    const uid = null;

    const res = await jrfSrv._awaitRes({uid});

    expect(res).toMatchObject({});

  });

  test('uid not found in _uids', async () => {

    const uid = 'testUid';

    const res = await jrfSrv._awaitRes({uid});

    expect(res).toMatchObject({});

  });

  test('timeout error', async () => {

    const uid = 'testUid';
    jrfSrv._uids = {
      testUid: {res: null, timeout: 66}
    };
    jrfSrv.consoleLog = false;
    const error = {error: {message: 'timeout 66'}};

    const res = await jrfSrv._awaitRes({uid});

    expect(res).toMatchObject(error);
    expect(jrfSrv._uids).toMatchObject({});

  });

  test('return cool', async () => {

    const uid = 'testUid';
    jrfSrv._uids = {
      testUid: {res: null, timeout: 500}
    };
    jrfSrv.consoleLog = false;

    let res;

    const awaitRes = (async () => {
      res = await jrfSrv._awaitRes({uid});
    })();

    const sendRes = (async () => {
      await jrfSrv._wait(40);
      jrfSrv._uids.testUid.res = 'cool';
      jrfSrv._uids.testUid.gotAnswer = true;
    })();

    await Promise.all([awaitRes, sendRes]);

    expect(res).toEqual('cool');
    expect(jrfSrv._uids).toMatchObject({});

  });

});

describe('process res', () => {

  test('not await res, not callback', async () => {

    const res = await jrfSrv._processRes();

    expect(res).toBeNull();

  });

  test('await res', async () => {

    const awaitRes = true;

    const res = await jrfSrv._processRes({awaitRes});
    const uid = jrfSrv._uids[res];


    expect(uid).toMatchObject({
      uid: res,
      res: null,
      awaitRes: true,
      timeout: jrfSrv.timeout
    });

  });

  test('await res with timeout', async () => {

    const awaitRes = true;

    const res = await jrfSrv._processRes({awaitRes, options: {timeout: 66}});
    const uid = jrfSrv._uids[res];


    expect(uid).toMatchObject({
      uid: res,
      res: null,
      awaitRes: true,
      timeout: 66
    });

  });

  test('callback', async () => {

    const callback = () => {
    };

    const res = await jrfSrv._processRes({callback});
    const uid = jrfSrv._uids[res];


    expect(uid).toMatchObject({
      uid: res,
      callback,
      timeout: jrfSrv.timeout
    });

  });

});

describe('add service routes', () => {

  test('service routes', () => {

    const routes = `[{"route":"jrfws2Group","act":"add"},{"route":"jrfws2Group","act":"del"},{"route":"jrfws2Group","act":"get"},{"route":"jrfws2Group","act":"addUser"},{"route":"jrfws2Group","act":"delUser"}]`;

    const res = jrfSrv._routes;

    expect(JSON.stringify(res)).toEqual(routes);

  });

});

describe('add history in system', () => {

  test('add history', () => {

    const user = {
      username: 'rick',
      login: 'rick',
      email: 'rick@rick.rick',
      rights: 'mega brainz',
      token: 'token'
    };
    jrfSrv.user = user;

    let system = jrfSrv._addHistoryInSystem({system: null});
    system = jrfSrv._addHistoryInSystem({system});
    const history = system.history;

    expect(history.length).toEqual(2);
    expect(history[0].user).toMatchObject({email: 'rick@rick.rick', username: 'rick'});
    expect(history[1].user).toMatchObject({email: 'rick@rick.rick', username: 'rick'});

  });

});

describe('get user for public mes', () => {

  test('invalid user', () => {

    const user = null;

    const res = jrfSrv._getUserForPublicMes({user});

    expect(res).toMatchObject({});

  });

  test('get user', () => {

    const user = {
      username: 'rick',
      login: 'rick',
      email: 'rick@rick.rick',
      rights: 'mega brainz',
      token: 'token'
    };
    jrfSrv.userIncludeFields = ['username', 'login', 'email', 'rights', 'token'];
    jrfSrv.userExcludeFields = ['login', 'rights', 'token'];

    const res = jrfSrv._getUserForPublicMes({user});

    expect(res).toMatchObject({
      username: 'rick',
      email: 'rick@rick.rick'
    });

  });

});

describe('on process log', () => {

  test('console log is not function', async () => {

    jrfSrv.onConsoleLog = null;

    const res = await jrfSrv._onProcessLog({log: 'test log'});

    expect(res).toBeUndefined();

  });

  test('console log', async () => {

    const res = {test: false};
    jrfSrv.consoleLog = true;
    jrfSrv.onConsoleLog = async ({log}) => {
      res.test = log;
    };

    await jrfSrv._onProcessLog({log: 'test log'});

    expect(res.test).toEqual('test log');

  });

  test('not log', async () => {

    const res = {test: false};
    jrfSrv.consoleLog = true;
    jrfSrv.onConsoleLog = async ({log}) => {
      res.test = log;
    };

    await jrfSrv._onProcessLog({log: ''});

    expect(res.test).toBeFalsy();

  });

});
