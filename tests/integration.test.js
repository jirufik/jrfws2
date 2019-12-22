const {JRFWSServer, JRFWSClient} = require('../index');
const pathExists = require('jrf-path-exists');

const PORT = 8011;

let jrfwsSrv = new JRFWSServer();
let jrfwsClientRick = new JRFWSClient();
let jrfwsClientMorty = new JRFWSClient();
let jrfwsClientMortyOne = new JRFWSClient();
let jrfwsClientMrShitman = new JRFWSClient();

let globalRes;
let globalResBrodacast;

beforeEach(async (done) => {

  // init server and clients
  jrfwsSrv = new JRFWSServer();
  jrfwsSrv.consoleLog = false;

  jrfwsClientRick = new JRFWSClient();
  jrfwsClientRick.consoleLog = false;

  jrfwsClientMorty = new JRFWSClient();
  jrfwsClientMorty.consoleLog = false;

  jrfwsClientMortyOne = new JRFWSClient();
  jrfwsClientMortyOne.consoleLog = false;

  jrfwsClientMrShitman = new JRFWSClient();
  jrfwsClientMrShitman.consoleLog = false;

  resetGlobalRes();
  resetGlobalResBroadcast();

  // create users
  createUsers();

  // create routes
  await createServerRoutes();
  await createClientRoutes();

  // create auth
  createAuth();

  // start server and clients
  await startServer();
  await startClients();

  // auth
  await authClients();

  resetGlobalRes();
  resetGlobalResBroadcast();

  done();

});

afterEach(async (done) => {

  await stopClients();
  await jrfwsSrv.stopServer();

  done();

});

function wait(milliseconds = 1000) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function getRickClient() {

  for (const client of jrfwsSrv.wss.clients) {
    const username = pathExists(client, 'user.username');
    if (username === 'rick') return client;
  }

}

function resetGlobalRes() {

  globalRes = {
    routing: {
      startAllRoutes: {
        passed: false
      },
      routeUsers: {
        passed: false
      },
      routeUsersActAdd: {
        passed: false
      },
      endAllRoutes: {
        passed: false
      },
      notFound: {
        passed: false
      },
    },
    data: {}
  };

}

function resetGlobalResBroadcast() {

  globalResBrodacast = {
    rick: {
      gotMes: false,
      data: null
    },
    morty: {
      gotMes: false,
      data: null
    },
    mortyOne: {
      gotMes: false,
      data: null
    },
    mrShitman: {
      gotMes: false,
      data: null
    }
  };

}

function createAuth() {

  jrfwsSrv.auth = async ({user, client, data, action}) => {

    if (data.route !== 'auth') {

      if (!data.user || !data.user.token) {

        action.stop = true;
        return;

      } else {

        action.stop = !data.user.token.includes('token');
        return;

      }

    }

    if (!data.user || !data.user.email) {
      action.stop = false;
      return;
    }

    client.user = data.user;

  }

}

async function createServerRoutes() {

  await Promise.all([
    jrfwsSrv.route({
      func: async ({data, stop}) => {
        globalRes.routing.startAllRoutes.passed = true;
        globalRes.data = data;
      }
    }),

    jrfwsSrv.route({
      route: 'client wait res',
      func: async ({data, stop}) => {
        stop();
        return 'client wait res';
      }
    }),

    jrfwsSrv.route({
      route: 'get null',
      func: async ({data, stop}) => {
        return null;
      }
    }),

    jrfwsSrv.route({
      route: 'get false',
      act: 'with act',
      func: async ({data, stop}) => {
        return false;
      }
    }),

    jrfwsSrv.route({
      route: 'users',
      func: async ({data, stop}) => {
        globalRes.routing.routeUsers.passed = true;
        globalRes.data = data;
      }
    }),

    jrfwsSrv.route({
      route: 'users',
      act: 'add',
      func: async ({data, stop}) => {
        globalRes.routing.routeUsersActAdd.passed = true;
        globalRes.data = data;
      }
    }),

    jrfwsSrv.route({
      func: async ({data, stop}) => {
        globalRes.routing.endAllRoutes.passed = true;
        globalRes.data = data;
      }
    }),

    jrfwsSrv.route({
      route: 'auth',
      func: async ({data, stop}) => {
      }
    }),

    jrfwsSrv.route({
      route: 'not found',
      func: async ({data, stop}) => {
        globalRes.routing.notFound.passed = true;
        globalRes.data = data;
      }
    })
  ]);

}

async function createClientRoutes() {

  const createRoutes = ({client, name}) => {
    return [

      client.route({
        func: async ({data, stop}) => {
          globalRes.routing.startAllRoutes.passed = true;
          globalRes.data = data;
        }
      }),

      client.route({
        route: 'srv wait res',
        func: async ({data, stop}) => {
          stop();
          return `srv wait res, client: ${name}`;
        }
      }),

      client.route({
        route: 'test broadcast',
        func: async ({data, stop}) => {
          let nameUser = name;
          if (nameUser === 'morty one') nameUser = 'mortyOne';
          if (nameUser === 'mr. shitman') nameUser = 'mrShitman';
          globalResBrodacast[nameUser].gotMes = true;
          globalResBrodacast[nameUser].data = data;
          return `test broadcast, client: ${name}`;
        }
      }),

      client.route({
        route: 'res from server',
        func: async ({data, stop}) => {
          return `res from server, client: ${name}`;
        }
      }),

      client.route({
        route: 'res callback',
        func: async ({data, stop}) => {
          return `res callback: ${name}`;
        }
      }),

      client.route({
        route: 'users',
        func: async ({data, stop}) => {
          globalRes.routing.routeUsers.passed = true;
          globalRes.data = data;
        }
      }),

      client.route({
        route: 'users',
        act: 'add',
        func: async ({data, stop}) => {
          globalRes.routing.routeUsersActAdd.passed = true;
          globalRes.data = data;
        }
      }),

      client.route({
        route: 'auth',
        func: async ({data, stop}) => {
        }
      }),

      client.route({
        func: async ({data, stop}) => {
          globalRes.routing.endAllRoutes.passed = true;
          globalRes.data = data;
        }
      }),

      client.route({
        route: 'not found',
        func: async ({data, stop}) => {
          globalRes.routing.notFound.passed = true;
          globalRes.data = data;
        }
      })

    ]
  };

  const routes = [
    createRoutes({client: jrfwsClientRick, name: 'rick'}),
    createRoutes({client: jrfwsClientMorty, name: 'morty'}),
    createRoutes({client: jrfwsClientMortyOne, name: 'morty one'}),
    createRoutes({client: jrfwsClientMrShitman, name: 'mr. shitman'})
  ];

  await Promise.all(routes);

}

function createUsers() {

  const server = {
    username: 'Server'
  };
  jrfwsSrv.user = {...jrfwsSrv.user, ...server};

  const rick = {
    username: 'rick',
    email: 'rick@rick.rc',
    phone: 'rick phone',
    rights: 'mega brainzzz',
    token: 'rick token'
  };
  jrfwsClientRick.user = {...jrfwsClientRick.user, ...rick};

  const morty = {
    username: 'morty',
    email: 'morty@morty.mr',
    phone: 'morty phone',
    rights: 'sancho pance',
    token: 'morty token'
  };
  jrfwsClientMorty.user = {...jrfwsClientMorty.user, ...morty};

  const mortyOne = {
    username: 'morty',
    email: 'morty@morty.mr',
    phone: 'morty phone',
    rights: 'sancho pance',
    token: 'morty one token'
  };
  jrfwsClientMortyOne.user = {...jrfwsClientMortyOne.user, ...mortyOne};

  const mrShitman = {
    username: 'mr. shitman',
    email: 'mrshitman@shitman.sh',
    phone: 'mr. shitman phone',
    rights: 'shithero',
    token: 'mr. shitman token'
  };
  jrfwsClientMrShitman.user = {...jrfwsClientMrShitman.user, ...mrShitman};

}

async function startServer() {

  jrfwsSrv.user.username = 'server';
  jrfwsSrv.consoleLog = false;
  await jrfwsSrv.startServer({port: PORT});

}

async function startClients() {

  await Promise.all([
    jrfwsClientRick.startClient({url: `ws://localhost:${PORT}`}),
    jrfwsClientMorty.startClient({url: `ws://localhost:${PORT}`}),
    jrfwsClientMortyOne.startClient({url: `ws://localhost:${PORT}`}),
    jrfwsClientMrShitman.startClient({url: `ws://localhost:${PORT}`})
  ]);

  await wait();

}

async function stopClients() {

  await Promise.all([
    jrfwsClientRick.stopClient(),
    jrfwsClientMorty.stopClient(),
    jrfwsClientMortyOne.stopClient(),
    jrfwsClientMrShitman.stopClient()
  ]);

}

async function authClients() {

  await Promise.all([
    jrfwsClientRick.sendMes({route: 'auth'}),
    jrfwsClientMorty.sendMes({route: 'auth'}),
    jrfwsClientMortyOne.sendMes({route: 'auth'}),
    jrfwsClientMrShitman.sendMes({route: 'auth'}),
  ]);

  await wait(500);

}

function objDelPropsForMatch(obj) {

  if (!obj) return;

  delete obj.uid;

  const user = pathExists(obj, 'user');
  if (user) delete user.uid;

  const fromUser = pathExists(obj, 'from.fromUser');
  if (fromUser) delete fromUser.uid;

  let history = pathExists(obj, 'system.history');
  if (history) {
    history = history.map(historyEl => {
      delete historyEl.date;
      if (pathExists(historyEl, 'user.uid')) delete historyEl.user.uid;
    });
  }

}

function objBroadcastDelPropsForMatch(obj) {

  if (!obj) return;

  const users = Object.keys(obj);
  for (const name of users) {
    objDelPropsForMatch(obj[name].data);
  }

}

function addIsValidInRoute({route, act, start = false, isValid, stopRoute = false}) {

  const wrapFn = (routeEl) => {
    const fn = routeEl.fn;
    routeEl.fn = async ({data, stop}) => {
      await fn({data, stop});
      if (stopRoute) stop();
      isValid();
    }
  };

  const routes = pathExists(jrfwsSrv, '_routes', []);
  let count = 0;

  for (routeEl of routes) {

    if (!route && !act) {

      if (routeEl.route || routeEl.act) continue;

      if (!start && count === 0) {

        count++;
        continue;

      } else {
        wrapFn(routeEl);
        break;
      }

    } else if (route === 'not found') {

      const fn = jrfwsSrv._routeNotFound;
      jrfwsSrv._routeNotFound = async ({data, stop}) => {
        await fn({data, stop});
        isValid();
      };
      break;

    } else {

      if (route) {
        if (routeEl.route !== route) continue;
      } else {
        if (routeEl.route) continue;
      }

      if (act) {
        if (routeEl.act !== act) continue;
      } else {
        if (routeEl.act) continue;
      }

      wrapFn(routeEl);
      break;

    }

  }

}

function addIsValidInClientRoute({client, route, act, start = false, isValid, stopRoute = false}) {

  const wrapFn = (routeEl) => {
    const fn = routeEl.fn;
    routeEl.fn = async ({data, stop}) => {
      await fn({data, stop});
      if (stopRoute) stop();
      isValid();
    }
  };

  const routes = pathExists(client, '_routes', []);
  let count = 0;

  for (routeEl of routes) {

    if (!route && !act) {

      if (routeEl.route || routeEl.act) continue;

      if (!start && count === 0) {

        count++;
        continue;

      } else {
        wrapFn(routeEl);
        break;
      }

    } else if (route === 'not found') {

      const fn = client._routeNotFound;
      client._routeNotFound = async ({data, stop}) => {
        await fn({data, stop});
        isValid();
      };
      break;

    } else {

      if (route) {
        if (routeEl.route !== route) continue;
      } else {
        if (routeEl.route) continue;
      }

      if (act) {
        if (routeEl.act !== act) continue;
      } else {
        if (routeEl.act) continue;
      }

      wrapFn(routeEl);
      break;

    }

  }

}

describe('server', () => {

  test('wait res', async () => {

    let client;
    for (const ws of jrfwsSrv.wss.clients) {
      client = ws;
      break;
    }

    let res = await jrfwsSrv.sendMes({client, route: 'srv wait res', awaitRes: true});

    expect(res.includes('srv wait res, client:')).toBeTruthy();

  });

  test('callback', async (done) => {

    const callback = (res) => {

      const data = {
        uid: 'CPZpxsGbjgAeeib15112019937543',
        isRes: true,
        user:
          {
            username: 'rick',
            email: 'rick@rick.rc',
            token: 'rick token',
            rights: 'mega brainzzz',
            phone: 'rick phone',
            uid: 'ByRZxeoFDYtNgjZ1511201993624'
          },
        data: 'srv wait res, client: rick',
        route: 'srv wait res',
        system: {
          history: [
            {
              user:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'geUETWgSzMOnFUr151120199436742'
                },
              date: '2019-12-15T06:04:38.261Z'
            },
            {
              user:
                {
                  email: 'rick@rick.rc',
                  phone: 'rick phone',
                  username: 'rick',
                  uid: 'ToUTvQpylnWvpyf151120199436742'
                },
              date: '2019-12-15T06:04:38.261Z'
            }
          ]
        }
      };

      objDelPropsForMatch(res.data);
      objDelPropsForMatch(data);
      expect(res.data).toMatchObject(data);

      done();
    };

    await jrfwsSrv.sendMes({route: 'srv wait res', client: getRickClient(), callback});

  });

  test('route not found', async (done) => {

    const isValid = () => {

      const routing = {
        startAllRoutes: {
          passed: true
        },
        routeUsers: {
          passed: false
        },
        routeUsersActAdd: {
          passed: false
        },
        endAllRoutes: {
          passed: true
        },
        notFound: {
          passed: true
        },
      };

      let data = {
        route: 'bad route',
        act: null,
        uid: null,
        user:
          {
            username: 'rick',
            email: 'rick@rick.rc',
            token: 'rick token',
            rights: 'mega brainzzz',
            phone: 'rick phone',
            uid: 'qIdMggQSXcIyUHc1411201917035179'
          },
        system: {
          history: [{
            user:
              {
                email: 'rick@rick.rc',
                phone: 'rick phone',
                username: 'rick',
                uid: 'oDORwocjdfudYSz1411201917345826'
              },
            date: '2019-12-14T14:03:47.348Z'
          }]
        },
        isRes: false
      };

      objDelPropsForMatch(globalRes.data);
      objDelPropsForMatch(data);
      expect(globalRes.data).toMatchObject(data);
      expect(globalRes.routing).toMatchObject(routing);
      done();

    };

    addIsValidInRoute({route: 'not found', isValid});

    await jrfwsClientRick.sendMes({route: 'bad route'});

  });

  test('route: users, stop in users', async (done) => {

    const isValid = () => {

      const routing = {
        startAllRoutes: {
          passed: true
        },
        routeUsers: {
          passed: true
        },
        routeUsersActAdd: {
          passed: false
        },
        endAllRoutes: {
          passed: false
        },
        notFound: {
          passed: false
        },
      };

      let data = {
        route: 'users',
        act: null,
        uid: null,
        data: {test: 'testData'},
        user:
          {
            username: 'rick',
            email: 'rick@rick.rc',
            token: 'rick token',
            rights: 'mega brainzzz',
            phone: 'rick phone',
            uid: 'qIdMggQSXcIyUHc1411201917035179'
          },
        system: {
          history: [{
            user:
              {
                email: 'rick@rick.rc',
                phone: 'rick phone',
                username: 'rick',
                uid: 'oDORwocjdfudYSz1411201917345826'
              },
            date: '2019-12-14T14:03:47.348Z'
          }]
        },
        isRes: false
      };

      objDelPropsForMatch(globalRes.data);
      objDelPropsForMatch(data);
      expect(globalRes.data).toMatchObject(data);
      expect(globalRes.routing).toMatchObject(routing);
      done();

    };

    addIsValidInRoute({route: 'users', isValid, stopRoute: true});

    await jrfwsClientRick.sendMes({route: 'users', data: {test: 'testData'}});

  });

  test('route: users', async (done) => {

    const isValid = () => {

      const routing = {
        startAllRoutes: {
          passed: true
        },
        routeUsers: {
          passed: true
        },
        routeUsersActAdd: {
          passed: false
        },
        endAllRoutes: {
          passed: true
        },
        notFound: {
          passed: false
        },
      };

      let data = {
        route: 'users',
        act: null,
        uid: null,
        data: {test: 'testData'},
        user:
          {
            username: 'rick',
            email: 'rick@rick.rc',
            token: 'rick token',
            rights: 'mega brainzzz',
            phone: 'rick phone',
            uid: 'qIdMggQSXcIyUHc1411201917035179'
          },
        system: {
          history: [{
            user:
              {
                email: 'rick@rick.rc',
                phone: 'rick phone',
                username: 'rick',
                uid: 'oDORwocjdfudYSz1411201917345826'
              },
            date: '2019-12-14T14:03:47.348Z'
          }]
        },
        isRes: false
      };

      objDelPropsForMatch(globalRes.data);
      objDelPropsForMatch(data);
      expect(globalRes.data).toMatchObject(data);
      expect(globalRes.routing).toMatchObject(routing);
      done();

    };

    addIsValidInRoute({isValid});

    await jrfwsClientRick.sendMes({route: 'users', data: {test: 'testData'}});

  });

  test('route: users, act: add', async (done) => {

    const isValid = () => {

      const routing = {
        startAllRoutes: {
          passed: true
        },
        routeUsers: {
          passed: true
        },
        routeUsersActAdd: {
          passed: true
        },
        endAllRoutes: {
          passed: true
        },
        notFound: {
          passed: false
        },
      };

      let data = {
        route: 'users',
        act: 'add',
        uid: null,
        data: {test: 'testData'},
        user:
          {
            username: 'rick',
            email: 'rick@rick.rc',
            token: 'rick token',
            rights: 'mega brainzzz',
            phone: 'rick phone',
            uid: 'qIdMggQSXcIyUHc1411201917035179'
          },
        system: {
          history: [{
            user:
              {
                email: 'rick@rick.rc',
                phone: 'rick phone',
                username: 'rick',
                uid: 'oDORwocjdfudYSz1411201917345826'
              },
            date: '2019-12-14T14:03:47.348Z'
          }]
        },
        isRes: false
      };

      objDelPropsForMatch(globalRes.data);
      objDelPropsForMatch(data);
      expect(globalRes.data).toMatchObject(data);
      expect(globalRes.routing).toMatchObject(routing);
      done();

    };

    addIsValidInRoute({isValid});

    await jrfwsClientRick.sendMes({route: 'users', act: 'add', data: {test: 'testData'}});

  });

});

describe('client', () => {

  test('wait res', async () => {

    let res = await jrfwsClientRick.sendMes({route: 'client wait res', awaitRes: true});

    expect(res.includes('client wait res')).toBeTruthy();

  });

  test('callback', async (done) => {

    const callback = (res) => {

      const data = {
        uid: 'CPZpxsGbjgAeeib15112019937543',
        isRes: true,
        user:
          {
            username: 'server',
            email: '',
            token: '',
            rights: null,
            phone: '',
            uid: 'ByRZxeoFDYtNgjZ1511201993624'
          },
        data: 'client wait res',
        route: 'client wait res',
        system: {
          history: [
            {
              user:
                {
                  email: 'rick@rick.rc',
                  phone: 'rick phone',
                  username: 'rick',
                  uid: 'ToUTvQpylnWvpyf151120199436742'
                },
              date: '2019-12-15T06:04:38.261Z'
            },
            {
              user:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'geUETWgSzMOnFUr151120199436742'
                },
              date: '2019-12-15T06:04:38.261Z'
            }
          ]
        }
      };

      objDelPropsForMatch(res.data);
      objDelPropsForMatch(data);
      expect(res.data).toMatchObject(data);

      done();
    };

    await jrfwsClientRick.sendMes({route: 'client wait res', callback});

  });

  test('route not found', async (done) => {

    const isValid = () => {

      const routing = {
        startAllRoutes: {
          passed: true
        },
        routeUsers: {
          passed: false
        },
        routeUsersActAdd: {
          passed: false
        },
        endAllRoutes: {
          passed: true
        },
        notFound: {
          passed: true
        },
      };

      let data = {
        route: 'bad route',
        act: null,
        uid: null,
        user:
          {
            username: 'server',
            uid: 'qIdMggQSXcIyUHc1411201917035179'
          },
        system: {
          history: [{
            user:
              {
                username: 'server',
                uid: 'oDORwocjdfudYSz1411201917345826'
              },
            date: '2019-12-14T14:03:47.348Z'
          }]
        },
        isRes: false
      };

      objDelPropsForMatch(globalRes.data);
      objDelPropsForMatch(data);
      expect(globalRes.data).toMatchObject(data);
      expect(globalRes.routing).toMatchObject(routing);
      done();

    };

    addIsValidInClientRoute({route: 'not found', isValid, client: jrfwsClientRick});

    await jrfwsSrv.sendMes({client: getRickClient(), route: 'bad route'});

  });

  test('route: users, stop in users', async (done) => {

    const isValid = () => {

      const routing = {
        startAllRoutes: {
          passed: true
        },
        routeUsers: {
          passed: true
        },
        routeUsersActAdd: {
          passed: false
        },
        endAllRoutes: {
          passed: false
        },
        notFound: {
          passed: false
        },
      };

      let data = {
        route: 'users',
        act: null,
        uid: null,
        data: {test: 'testData'},
        user:
          {
            username: 'server',
            uid: 'qIdMggQSXcIyUHc1411201917035179'
          },
        system: {
          history: [{
            user:
              {
                username: 'server',
                uid: 'oDORwocjdfudYSz1411201917345826'
              },
            date: '2019-12-14T14:03:47.348Z'
          }]
        },
        isRes: false
      };

      objDelPropsForMatch(globalRes.data);
      objDelPropsForMatch(data);
      expect(globalRes.data).toMatchObject(data);
      expect(globalRes.routing).toMatchObject(routing);
      done();

    };

    addIsValidInClientRoute({route: 'users', isValid, stopRoute: true, client: jrfwsClientRick});

    await jrfwsSrv.sendMes({route: 'users', data: {test: 'testData'}, client: getRickClient()});

  });

  test('route: users', async (done) => {

    const isValid = () => {

      const routing = {
        startAllRoutes: {
          passed: true
        },
        routeUsers: {
          passed: true
        },
        routeUsersActAdd: {
          passed: false
        },
        endAllRoutes: {
          passed: true
        },
        notFound: {
          passed: false
        },
      };

      let data = {
        route: 'users',
        act: null,
        uid: null,
        data: {test: 'testData'},
        user:
          {
            username: 'server',
            uid: 'qIdMggQSXcIyUHc1411201917035179'
          },
        system: {
          history: [{
            user:
              {
                username: 'server',
                uid: 'oDORwocjdfudYSz1411201917345826'
              },
            date: '2019-12-14T14:03:47.348Z'
          }]
        },
        isRes: false
      };

      objDelPropsForMatch(globalRes.data);
      objDelPropsForMatch(data);
      expect(globalRes.data).toMatchObject(data);
      expect(globalRes.routing).toMatchObject(routing);
      done();

    };

    addIsValidInClientRoute({isValid, client: jrfwsClientRick});

    await jrfwsSrv.sendMes({route: 'users', data: {test: 'testData'}, client: getRickClient()});

  });

  test('route: users, act: add', async (done) => {

    const isValid = () => {

      const routing = {
        startAllRoutes: {
          passed: true
        },
        routeUsers: {
          passed: true
        },
        routeUsersActAdd: {
          passed: true
        },
        endAllRoutes: {
          passed: true
        },
        notFound: {
          passed: false
        },
      };

      let data = {
        route: 'users',
        act: 'add',
        uid: null,
        data: {test: 'testData'},
        user:
          {
            username: 'server',
            uid: 'qIdMggQSXcIyUHc1411201917035179'
          },
        system: {
          history: [{
            user:
              {
                username: 'server',
                uid: 'oDORwocjdfudYSz1411201917345826'
              },
            date: '2019-12-14T14:03:47.348Z'
          }]
        },
        isRes: false
      };

      objDelPropsForMatch(globalRes.data);
      objDelPropsForMatch(data);
      expect(globalRes.data).toMatchObject(data);
      expect(globalRes.routing).toMatchObject(routing);
      done();

    };

    addIsValidInClientRoute({isValid, client: jrfwsClientRick});

    await jrfwsSrv.sendMes({route: 'users', act: 'add', data: {test: 'testData'}, client: getRickClient()});

  });

});

describe('broadcast groups', () => {

  describe('server', () => {

    test('add bad group', async () => {

      const group = {};

      const res = await jrfwsSrv.addGroup({group});

      expect(res).toBeFalsy();
      expect(jrfwsSrv.groups).toMatchObject({});

    });

    test('add group', async () => {

      const group = {
        name: 'megaBrainzzz',
        description: 'is mega brainzzz'
      };

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        }
      };

      const res = await jrfwsSrv.addGroup({group});
      expect(res).toBeTruthy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('add groups', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: []
        }
      };

      const res = await jrfwsSrv.addGroup({group});
      expect(res).toBeTruthy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('add group hook before', async () => {

      const group = {
        name: 'megaBrainzzz',
        description: 'is mega brainzzz'
      };

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz hook',
          users: []
        }
      };

      jrfwsSrv.onBeforeAddGroup = ({sender, group, mes, mesSendServer}) => {
        group.description += ' hook';
        return true;
      };

      const res = await jrfwsSrv.addGroup({group});
      expect(res).toBeTruthy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('add group hook before stop', async () => {

      const group = {
        name: 'megaBrainzzz',
        description: 'is mega brainzzz'
      };

      const matchGroups = {};

      jrfwsSrv.onBeforeAddGroup = ({sender, group, mes, mesSendServer}) => {
        group.description += ' hook';
        return false;
      };

      const res = await jrfwsSrv.addGroup({group});
      expect(res).toBeFalsy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('add group hook after', async () => {

      const group = {
        name: 'megaBrainzzz',
        description: 'is mega brainzzz'
      };

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        }
      };

      let hookAfter = false;

      jrfwsSrv.onAfterAddGroup = ({sender, group, mes, mesSendServer}) => {
        hookAfter = true;
        return true;
      };

      const res = await jrfwsSrv.addGroup({group});

      expect(res).toBeTruthy();
      expect(hookAfter).toBeTruthy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('del bad group', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: []
        }
      };

      await jrfwsSrv.addGroup({group});
      const res = await jrfwsSrv.delGroup({group: 'bad group'});

      expect(res).toBeFalsy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('del group', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        }
      };

      await jrfwsSrv.addGroup({group});
      const res = await jrfwsSrv.delGroup({group: 'space'});

      expect(res).toBeTruthy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('del groups', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {};

      await jrfwsSrv.addGroup({group});
      const res = await jrfwsSrv.delGroup({group: ['space', {name: 'megaBrainzzz'}]});

      expect(res).toBeTruthy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('del groups hook before', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      let hook = false;

      const matchGroups = {};

      jrfwsSrv.onBeforeDelGroup = async ({group, sender, mes, mesSendServer}) => {
        hook = true;
        return true;
      };

      await jrfwsSrv.addGroup({group});
      const res = await jrfwsSrv.delGroup({group: ['space', {name: 'megaBrainzzz'}]});

      expect(res).toBeTruthy();
      expect(hook).toBeTruthy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('del groups hook before stop', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      let hook = false;

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: []
        }
      };

      jrfwsSrv.onBeforeDelGroup = async ({group, sender, mes, mesSendServer}) => {
        hook = true;
        return false;
      };

      await jrfwsSrv.addGroup({group});
      const res = await jrfwsSrv.delGroup({group: ['space', {name: 'megaBrainzzz'}]});

      expect(res).toBeFalsy();
      expect(hook).toBeTruthy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('del groups hook after', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      let hook = false;

      const matchGroups = {};

      jrfwsSrv.onAfterDelGroup = async ({group, sender, mes, mesSendServer}) => {
        hook = true;
        return true;
      };

      await jrfwsSrv.addGroup({group});
      const res = await jrfwsSrv.delGroup({group: ['space', {name: 'megaBrainzzz'}]});

      expect(res).toBeTruthy();
      expect(hook).toBeTruthy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('get groups', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: []
        }
      };

      await jrfwsSrv.addGroup({group});
      const res = await jrfwsSrv.getGroups();

      expect(res).toMatchObject(matchGroups);

    });

    test('get groups hook before', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: []
        }
      };

      let hook = false;

      jrfwsSrv.onBeforeGetGroups = async ({sender, mes, mesSendServer}) => {
        hook = true;
        return true;
      };

      await jrfwsSrv.addGroup({group});
      const res = await jrfwsSrv.getGroups();

      expect(hook).toBeTruthy();
      expect(res).toMatchObject(matchGroups);

    });

    test('get groups hook before stop', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: []
        }
      };

      let hook = false;

      jrfwsSrv.onBeforeGetGroups = async ({sender, mes, mesSendServer}) => {
        hook = true;
        return false;
      };

      await jrfwsSrv.addGroup({group});
      const res = await jrfwsSrv.getGroups();

      expect(hook).toBeTruthy();
      expect(res).toBeFalsy();

    });

    test('get groups hook after', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: []
        }
      };

      let hook = false;

      jrfwsSrv.onAfterGetGroups = async ({sender, mes, mesSendServer}) => {
        hook = true;
        return true;
      };

      await jrfwsSrv.addGroup({group});
      const res = await jrfwsSrv.getGroups();

      expect(hook).toBeTruthy();
      expect(res).toMatchObject(matchGroups);

    });

    test('add bad user', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: []
        }
      };

      await jrfwsSrv.addGroup({group});
      const res = await jrfwsSrv.addUserToGroup({group: 'space', user: ''});

      expect(res).toBeFalsy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('add user in bad group', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: []
        }
      };

      await jrfwsSrv.addGroup({group});
      const res = await jrfwsSrv.addUserToGroup({group: 'bad group', user: ''});

      expect(res).toBeFalsy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('add user is string', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: ['rick']
        }
      };

      await jrfwsSrv.addGroup({group});
      const res = await jrfwsSrv.addUserToGroup({group: 'space', user: 'rick'});

      expect(res).toBeTruthy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('add user is object', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: [{username: 'rick'}]
        }
      };

      await jrfwsSrv.addGroup({group});
      const res = await jrfwsSrv.addUserToGroup({group: 'space', user: {username: 'rick'}});

      expect(res).toBeTruthy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('add users', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: [{username: 'rick'}, 'morty']
        }
      };

      await jrfwsSrv.addGroup({group});
      let res = await jrfwsSrv.addUserToGroup({group: 'space', user: {username: 'rick'}});
      res = await jrfwsSrv.addUserToGroup({group: 'space', user: 'rick'});
      res = await jrfwsSrv.addUserToGroup({group: 'space', user: 'morty'});

      expect(res).toBeTruthy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('add user hook before', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: ['rick']
        }
      };

      let hook = false;

      jrfwsSrv.onBeforeAddUserToGroup = ({user, mes, sender, group, clients, mesSendServer}) => {
        hook = true;
        return true;
      };

      await jrfwsSrv.addGroup({group});
      const res = await jrfwsSrv.addUserToGroup({group: 'space', user: 'rick'});

      expect(res).toBeTruthy();
      expect(hook).toBeTruthy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('add user hook before stop', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: []
        }
      };

      let hook = false;

      jrfwsSrv.onBeforeAddUserToGroup = ({user, mes, sender, group, clients, mesSendServer}) => {
        hook = true;
        return false;
      };

      await jrfwsSrv.addGroup({group});
      const res = await jrfwsSrv.addUserToGroup({group: 'space', user: 'rick'});

      expect(res).toBeFalsy();
      expect(hook).toBeTruthy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('add user hook after', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: ['rick']
        }
      };

      let hook = false;

      jrfwsSrv.onAfterAddUserToGroup = ({user, mes, sender, group, clients, mesSendServer}) => {
        hook = true;
        return true;
      };

      await jrfwsSrv.addGroup({group});
      const res = await jrfwsSrv.addUserToGroup({group: 'space', user: 'rick'});

      expect(res).toBeTruthy();
      expect(hook).toBeTruthy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('del bad user', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: [{username: 'rick'}, 'morty']
        }
      };

      await jrfwsSrv.addGroup({group});
      let res = await jrfwsSrv.addUserToGroup({group: 'space', user: {username: 'rick'}});
      res = await jrfwsSrv.addUserToGroup({group: 'space', user: 'rick'});
      res = await jrfwsSrv.addUserToGroup({group: 'space', user: 'morty'});

      res = await jrfwsSrv.delUserToGroup({group: 'space', user: ''});

      expect(res).toBeFalsy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('del user in bad group', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: [{username: 'rick'}, 'morty']
        }
      };

      await jrfwsSrv.addGroup({group});
      let res = await jrfwsSrv.addUserToGroup({group: 'space', user: {username: 'rick'}});
      res = await jrfwsSrv.addUserToGroup({group: 'space', user: 'rick'});
      res = await jrfwsSrv.addUserToGroup({group: 'space', user: 'morty'});

      res = await jrfwsSrv.delUserToGroup({group: 'bad group', user: 'rick'});

      expect(res).toBeFalsy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('del user is string', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: [{username: 'rick'}]
        }
      };

      await jrfwsSrv.addGroup({group});
      let res = await jrfwsSrv.addUserToGroup({group: 'space', user: {username: 'rick'}});
      res = await jrfwsSrv.addUserToGroup({group: 'space', user: 'rick'});
      res = await jrfwsSrv.addUserToGroup({group: 'space', user: 'morty'});

      res = await jrfwsSrv.delUserToGroup({group: 'space', user: 'morty'});

      expect(res).toBeTruthy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('del user is object', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: [{username: 'rick'}]
        }
      };

      await jrfwsSrv.addGroup({group});
      let res = await jrfwsSrv.addUserToGroup({group: 'space', user: {username: 'rick', token: 'rick token'}});
      res = await jrfwsSrv.addUserToGroup({group: 'space', user: 'rick'});
      res = await jrfwsSrv.addUserToGroup({group: 'space', user: 'morty'});

      res = await jrfwsSrv.delUserToGroup({group: 'space', user: {username: 'morty', token: 'token'}});

      expect(res).toBeTruthy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('del user hook before', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: [{username: 'rick'}]
        }
      };

      let hook = false;

      jrfwsSrv.onBeforeDelUserToGroup = async ({sender, user, group, clients, mes, mesSendServer}) => {
        hook = true;
        return true;
      };

      await jrfwsSrv.addGroup({group});
      let res = await jrfwsSrv.addUserToGroup({group: 'space', user: {username: 'rick'}});
      res = await jrfwsSrv.addUserToGroup({group: 'space', user: 'rick'});
      res = await jrfwsSrv.addUserToGroup({group: 'space', user: 'morty'});

      res = await jrfwsSrv.delUserToGroup({group: 'space', user: 'morty'});

      expect(res).toBeTruthy();
      expect(hook).toBeTruthy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('del user hook before stop', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: [{username: 'rick'}, 'morty']
        }
      };

      let hook = false;

      jrfwsSrv.onBeforeDelUserToGroup = async ({sender, user, group, clients, mes, mesSendServer}) => {
        hook = true;
        return false;
      };

      await jrfwsSrv.addGroup({group});
      let res = await jrfwsSrv.addUserToGroup({group: 'space', user: {username: 'rick'}});
      res = await jrfwsSrv.addUserToGroup({group: 'space', user: 'rick'});
      res = await jrfwsSrv.addUserToGroup({group: 'space', user: 'morty'});

      res = await jrfwsSrv.delUserToGroup({group: 'space', user: 'morty'});

      expect(res).toBeFalsy();
      expect(hook).toBeTruthy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('del user hook after', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: [{username: 'rick'}]
        }
      };

      let hook = false;

      jrfwsSrv.onAfterDelUserToGroup = async ({sender, user, group, clients, mes, mesSendServer}) => {
        hook = true;
        return true;
      };

      await jrfwsSrv.addGroup({group});
      let res = await jrfwsSrv.addUserToGroup({group: 'space', user: {username: 'rick'}});
      res = await jrfwsSrv.addUserToGroup({group: 'space', user: 'rick'});
      res = await jrfwsSrv.addUserToGroup({group: 'space', user: 'morty'});

      res = await jrfwsSrv.delUserToGroup({group: 'space', user: 'morty'});

      expect(res).toBeTruthy();
      expect(hook).toBeTruthy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

  });

  describe('client', () => {

    test('add bad group', async () => {

      const group = {};

      const res = await jrfwsClientRick.addGroup({group});

      expect(res).toBeFalsy();
      expect(jrfwsSrv.groups).toMatchObject({});

    });

    test('add group', async () => {

      const group = {
        name: 'megaBrainzzz',
        description: 'is mega brainzzz'
      };

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        }
      };

      const res = await jrfwsClientRick.addGroup({group});
      expect(res).toBeTruthy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('add groups', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: []
        }
      };

      const res = await jrfwsClientRick.addGroup({group});

      expect(res).toBeTruthy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('del bad group', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: []
        }
      };

      await jrfwsClientRick.addGroup({group});
      const res = await jrfwsClientRick.delGroup({group: 'bad group'});

      expect(res).toBeFalsy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('del group', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        }
      };

      await jrfwsClientRick.addGroup({group});
      const res = await jrfwsClientRick.delGroup({group: 'space'});

      expect(res).toBeTruthy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('del groups', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {};

      await jrfwsClientRick.addGroup({group});
      const res = await jrfwsClientRick.delGroup({group: ['space', {name: 'megaBrainzzz'}]});

      expect(res).toBeTruthy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('get groups', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: []
        }
      };

      await jrfwsClientRick.addGroup({group});
      const res = await jrfwsClientRick.getGroups();

      expect(res).toMatchObject(matchGroups);

    });

    test('add bad user', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: []
        }
      };

      await jrfwsClientRick.addGroup({group});
      const res = await jrfwsClientRick.addUserToGroup({group: 'space', user: ''});

      expect(res).toBeFalsy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('add user in bad group', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: []
        }
      };

      await jrfwsClientRick.addGroup({group});
      const res = await jrfwsClientRick.addUserToGroup({group: 'bad group', user: ''});

      expect(res).toBeFalsy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('add user is string', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: ['rick']
        }
      };

      await jrfwsClientRick.addGroup({group});
      const res = await jrfwsClientRick.addUserToGroup({group: 'space', user: 'rick'});

      expect(res).toBeTruthy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('add user is object', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: [{username: 'rick'}]
        }
      };

      await jrfwsClientRick.addGroup({group});
      const res = await jrfwsClientRick.addUserToGroup({group: 'space', user: {username: 'rick'}});

      expect(res).toBeTruthy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('add users', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: [{username: 'rick'}, 'morty']
        }
      };

      await jrfwsClientRick.addGroup({group});
      let res = await jrfwsClientRick.addUserToGroup({group: 'space', user: {username: 'rick', token: 'rick token'}});
      res = await jrfwsClientRick.addUserToGroup({group: 'space', user: 'rick'});
      res = await jrfwsClientRick.addUserToGroup({group: 'space', user: 'morty'});

      expect(res).toBeTruthy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('del bad user', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: [{username: 'rick'}, 'morty']
        }
      };

      await jrfwsClientRick.addGroup({group});
      let res = await jrfwsClientRick.addUserToGroup({group: 'space', user: {username: 'rick'}});
      res = await jrfwsClientRick.addUserToGroup({group: 'space', user: 'rick'});
      res = await jrfwsClientRick.addUserToGroup({group: 'space', user: 'morty'});

      res = await jrfwsClientRick.delUserToGroup({group: 'space', user: ''});

      expect(res).toBeFalsy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('del user in bad group', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: [{username: 'rick'}, 'morty']
        }
      };

      await jrfwsClientRick.addGroup({group});
      let res = await jrfwsClientRick.addUserToGroup({group: 'space', user: {username: 'rick'}});
      res = await jrfwsClientRick.addUserToGroup({group: 'space', user: 'rick'});
      res = await jrfwsClientRick.addUserToGroup({group: 'space', user: 'morty'});

      res = await jrfwsClientRick.delUserToGroup({group: 'bad group', user: 'rick'});

      expect(res).toBeFalsy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('del user is string', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: [{username: 'rick'}]
        }
      };

      await jrfwsClientRick.addGroup({group});
      let res = await jrfwsClientRick.addUserToGroup({group: 'space', user: {username: 'rick'}});
      res = await jrfwsClientRick.addUserToGroup({group: 'space', user: 'rick'});
      res = await jrfwsClientRick.addUserToGroup({group: 'space', user: 'morty'});

      res = await jrfwsClientRick.delUserToGroup({group: 'space', user: 'morty'});

      expect(res).toBeTruthy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

    test('del user is object', async () => {

      const group = [
        {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz'
        },
        {
          name: 'space',
          description: 'is spacemans'
        }
      ];

      const matchGroups = {
        megaBrainzzz: {
          name: 'megaBrainzzz',
          description: 'is mega brainzzz',
          users: []
        },
        space: {
          name: 'space',
          description: 'is spacemans',
          users: [{username: 'rick'}]
        }
      };

      await jrfwsClientRick.addGroup({group});
      let res = await jrfwsClientRick.addUserToGroup({group: 'space', user: {username: 'rick', token: 'rick token'}});
      res = await jrfwsClientRick.addUserToGroup({group: 'space', user: 'rick'});
      res = await jrfwsClientRick.addUserToGroup({group: 'space', user: 'morty'});

      res = await jrfwsClientRick.delUserToGroup({group: 'space', user: {username: 'morty', token: 'token'}});

      expect(res).toBeTruthy();
      expect(jrfwsSrv.groups).toMatchObject(matchGroups);

    });

  });

});

describe('broadcast', () => {

  beforeEach(async () => {

    const group = [
      {
        name: 'megaBrainzzz',
        description: 'is mega brainzzz'
      },
      {
        name: 'space',
        description: 'is spacemans'
      },
      {
        name: 'waterWorld',
        description: 'water world'
      }
    ];

    await jrfwsSrv.addGroup({group});

    await jrfwsSrv.addUserToGroup({group: 'megaBrainzzz', user: jrfwsClientRick.user});
    await jrfwsSrv.addUserToGroup({group: 'megaBrainzzz', user: jrfwsClientMrShitman.user});
    await jrfwsSrv.addUserToGroup({group: 'megaBrainzzz', user: jrfwsClientMortyOne.user});

    await jrfwsSrv.addUserToGroup({group: 'space', user: jrfwsClientRick.user});
    await jrfwsSrv.addUserToGroup({group: 'space', user: jrfwsClientMrShitman.user});
    await jrfwsSrv.addUserToGroup({group: 'space', user: 'Morty'});

    await jrfwsSrv.addUserToGroup({group: group[2], user: jrfwsClientRick.user});
    await jrfwsSrv.addUserToGroup({group: group[2], user: jrfwsClientMorty.user});

  });

  describe('server', () => {

    test('send to all', async () => {

      let matchRes = {
        rick: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: '',
                    phone: '',
                    username: 'server',
                    uid: 'ClIGgjFFwwpLMWc1611201921507210'
                  },
                date: '2019-12-16T18:50:08.743Z'
              },
                {
                  user:
                    {
                      email: 'rick@rick.rc',
                      phone: 'rick phone',
                      username: 'rick',
                      uid: 'uHsmsynqjEmnGKe1611201921507211'
                    },
                  date: '2019-12-16T18:50:08.749Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz', 'space', 'waterWorld']
            }
          }
        },
        morty: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            },
            system: {
              history: [{
                user:
                  {
                    email: '',
                    phone: '',
                    username: 'server',
                    uid: 'IaaVTHnmRANpDum16112019215220182'
                  },
                date: '2019-12-16T18:52:21.722Z'
              },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'WAEVWlOtGckTirP16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.726Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz', 'space', 'waterWorld']
            }
          }
        },
        mortyOne: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: '',
                    phone: '',
                    username: 'server',
                    uid: 'PlmODTUiNCwEELB16112019215321189'
                  },
                date: '2019-12-16T18:53:22.721Z'
              },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'xeXIljZYDPnVYuh16112019215321189'
                    },
                  date: '2019-12-16T18:53:22.724Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz', 'space', 'waterWorld']
            }
          }
        },
        mrShitman: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: '',
                    phone: '',
                    username: 'server',
                    uid: 'FcEKAIwnuvZYUcJ16112019215436216'
                  },
                date: '2019-12-16T18:54:37.750Z'
              },
                {
                  user:
                    {
                      email: 'mrshitman@shitman.sh',
                      phone: 'mr. shitman phone',
                      username: 'mr. shitman',
                      uid: 'UbHtILtgKDmknAO16112019215436217'
                    },
                  date: '2019-12-16T18:54:37.754Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz', 'space', 'waterWorld']
            }

          }
        }
      };


      await jrfwsSrv.sendMes({route: 'test broadcast', to: {}});
      await wait();

      objBroadcastDelPropsForMatch(globalResBrodacast);
      objBroadcastDelPropsForMatch(matchRes);
      expect(globalResBrodacast).toMatchObject(matchRes);

    });

    test('send to group megaBrainzzz', async () => {

      let matchRes = {
        rick: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: '',
                    phone: '',
                    username: 'server',
                    uid: 'ClIGgjFFwwpLMWc1611201921507210'
                  },
                date: '2019-12-16T18:50:08.743Z'
              },
                {
                  user:
                    {
                      email: 'rick@rick.rc',
                      phone: 'rick phone',
                      username: 'rick',
                      uid: 'uHsmsynqjEmnGKe1611201921507211'
                    },
                  date: '2019-12-16T18:50:08.749Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz']
            }
          }
        },
        morty: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            },
            system: {
              history: [{
                user:
                  {
                    email: '',
                    phone: '',
                    username: 'server',
                    uid: 'IaaVTHnmRANpDum16112019215220182'
                  },
                date: '2019-12-16T18:52:21.722Z'
              },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'WAEVWlOtGckTirP16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.726Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz']
            }
          }
        },
        mortyOne: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: '',
                    phone: '',
                    username: 'server',
                    uid: 'PlmODTUiNCwEELB16112019215321189'
                  },
                date: '2019-12-16T18:53:22.721Z'
              },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'xeXIljZYDPnVYuh16112019215321189'
                    },
                  date: '2019-12-16T18:53:22.724Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz']
            }
          }
        },
        mrShitman: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: '',
                    phone: '',
                    username: 'server',
                    uid: 'FcEKAIwnuvZYUcJ16112019215436216'
                  },
                date: '2019-12-16T18:54:37.750Z'
              },
                {
                  user:
                    {
                      email: 'mrshitman@shitman.sh',
                      phone: 'mr. shitman phone',
                      username: 'mr. shitman',
                      uid: 'UbHtILtgKDmknAO16112019215436217'
                    },
                  date: '2019-12-16T18:54:37.754Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz']
            }

          }
        }
      };


      await jrfwsSrv.sendMes({route: 'test broadcast', to: {groups: 'megaBrainzzz'}});
      await wait();

      objBroadcastDelPropsForMatch(globalResBrodacast);
      objBroadcastDelPropsForMatch(matchRes);
      expect(globalResBrodacast).toMatchObject(matchRes);

    });

    test('send to group waterWorld', async () => {

      let matchRes = {
        rick: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: '',
                    phone: '',
                    username: 'server',
                    uid: 'ClIGgjFFwwpLMWc1611201921507210'
                  },
                date: '2019-12-16T18:50:08.743Z'
              },
                {
                  user:
                    {
                      email: 'rick@rick.rc',
                      phone: 'rick phone',
                      username: 'rick',
                      uid: 'uHsmsynqjEmnGKe1611201921507211'
                    },
                  date: '2019-12-16T18:50:08.749Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['waterWorld']
            }
          }
        },
        morty: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            },
            system: {
              history: [{
                user:
                  {
                    email: '',
                    phone: '',
                    username: 'server',
                    uid: 'IaaVTHnmRANpDum16112019215220182'
                  },
                date: '2019-12-16T18:52:21.722Z'
              },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'WAEVWlOtGckTirP16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.726Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['waterWorld']
            }
          }
        },
        mortyOne: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: '',
                    phone: '',
                    username: 'server',
                    uid: 'PlmODTUiNCwEELB16112019215321189'
                  },
                date: '2019-12-16T18:53:22.721Z'
              },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'xeXIljZYDPnVYuh16112019215321189'
                    },
                  date: '2019-12-16T18:53:22.724Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['waterWorld']
            }
          }
        }
      };


      await jrfwsSrv.sendMes({route: 'test broadcast', to: {groups: 'waterWorld'}});
      await wait();

      objBroadcastDelPropsForMatch(globalResBrodacast);
      objBroadcastDelPropsForMatch(matchRes);
      expect(globalResBrodacast).toMatchObject(matchRes);

    });

    test('send to users rick', async () => {

      let matchRes = {
        rick: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: '',
                    phone: '',
                    username: 'server',
                    uid: 'ClIGgjFFwwpLMWc1611201921507210'
                  },
                date: '2019-12-16T18:50:08.743Z'
              },
                {
                  user:
                    {
                      email: 'rick@rick.rc',
                      phone: 'rick phone',
                      username: 'rick',
                      uid: 'uHsmsynqjEmnGKe1611201921507211'
                    },
                  date: '2019-12-16T18:50:08.749Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: null
            }
          }
        }
      };


      await jrfwsSrv.sendMes({route: 'test broadcast', to: {users: 'rick'}});
      await wait();

      objBroadcastDelPropsForMatch(globalResBrodacast);
      objBroadcastDelPropsForMatch(matchRes);
      expect(globalResBrodacast).toMatchObject(matchRes);

    });

    test('send to users morty', async () => {

      let matchRes = {
        morty: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            },
            system: {
              history: [{
                user:
                  {
                    email: '',
                    phone: '',
                    username: 'server',
                    uid: 'IaaVTHnmRANpDum16112019215220182'
                  },
                date: '2019-12-16T18:52:21.722Z'
              },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'WAEVWlOtGckTirP16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.726Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: null
            }
          }
        },
        mortyOne: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: '',
                    phone: '',
                    username: 'server',
                    uid: 'PlmODTUiNCwEELB16112019215321189'
                  },
                date: '2019-12-16T18:53:22.721Z'
              },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'xeXIljZYDPnVYuh16112019215321189'
                    },
                  date: '2019-12-16T18:53:22.724Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: null
            }
          }
        }
      };


      await jrfwsSrv.sendMes({route: 'test broadcast', to: {users: [jrfwsClientMorty.user]}});
      await wait();

      objBroadcastDelPropsForMatch(globalResBrodacast);
      objBroadcastDelPropsForMatch(matchRes);
      expect(globalResBrodacast).toMatchObject(matchRes);

    });

    test('send all exclude groups waterWorld', async () => {

      let matchRes = {
        rick: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: '',
                    phone: '',
                    username: 'server',
                    uid: 'ClIGgjFFwwpLMWc1611201921507210'
                  },
                date: '2019-12-16T18:50:08.743Z'
              },
                {
                  user:
                    {
                      email: 'rick@rick.rc',
                      phone: 'rick phone',
                      username: 'rick',
                      uid: 'uHsmsynqjEmnGKe1611201921507211'
                    },
                  date: '2019-12-16T18:50:08.749Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz', 'space']
            }
          }
        },
        morty: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            },
            system: {
              history: [{
                user:
                  {
                    email: '',
                    phone: '',
                    username: 'server',
                    uid: 'IaaVTHnmRANpDum16112019215220182'
                  },
                date: '2019-12-16T18:52:21.722Z'
              },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'WAEVWlOtGckTirP16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.726Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz', 'space']
            }
          }
        },
        mortyOne: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: '',
                    phone: '',
                    username: 'server',
                    uid: 'PlmODTUiNCwEELB16112019215321189'
                  },
                date: '2019-12-16T18:53:22.721Z'
              },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'xeXIljZYDPnVYuh16112019215321189'
                    },
                  date: '2019-12-16T18:53:22.724Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz', 'space']
            }
          }
        },
        mrShitman: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: '',
                    phone: '',
                    username: 'server',
                    uid: 'FcEKAIwnuvZYUcJ16112019215436216'
                  },
                date: '2019-12-16T18:54:37.750Z'
              },
                {
                  user:
                    {
                      email: 'mrshitman@shitman.sh',
                      phone: 'mr. shitman phone',
                      username: 'mr. shitman',
                      uid: 'UbHtILtgKDmknAO16112019215436217'
                    },
                  date: '2019-12-16T18:54:37.754Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz', 'space']
            }

          }
        }
      };


      await jrfwsSrv.sendMes({route: 'test broadcast', to: {excludeGroups: 'waterWorld'}});
      await wait();

      objBroadcastDelPropsForMatch(globalResBrodacast);
      objBroadcastDelPropsForMatch(matchRes);
      expect(globalResBrodacast).toMatchObject(matchRes);

    });

    test('send all exclude groups megaBrainzzz, space', async () => {

      let matchRes = {
        rick: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: '',
                    phone: '',
                    username: 'server',
                    uid: 'ClIGgjFFwwpLMWc1611201921507210'
                  },
                date: '2019-12-16T18:50:08.743Z'
              },
                {
                  user:
                    {
                      email: 'rick@rick.rc',
                      phone: 'rick phone',
                      username: 'rick',
                      uid: 'uHsmsynqjEmnGKe1611201921507211'
                    },
                  date: '2019-12-16T18:50:08.749Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['waterWorld']
            }
          }
        },
        morty: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            },
            system: {
              history: [{
                user:
                  {
                    email: '',
                    phone: '',
                    username: 'server',
                    uid: 'IaaVTHnmRANpDum16112019215220182'
                  },
                date: '2019-12-16T18:52:21.722Z'
              },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'WAEVWlOtGckTirP16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.726Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['waterWorld']
            }
          }
        },
        mortyOne: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: '',
                    phone: '',
                    username: 'server',
                    uid: 'PlmODTUiNCwEELB16112019215321189'
                  },
                date: '2019-12-16T18:53:22.721Z'
              },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'xeXIljZYDPnVYuh16112019215321189'
                    },
                  date: '2019-12-16T18:53:22.724Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['waterWorld']
            }
          }
        }
      };


      await jrfwsSrv.sendMes({route: 'test broadcast', to: {excludeGroups: ['megaBrainzzz', {name: 'space'}]}});
      await wait();

      objBroadcastDelPropsForMatch(globalResBrodacast);
      objBroadcastDelPropsForMatch(matchRes);
      expect(globalResBrodacast).toMatchObject(matchRes);

    });

    test('send to all exclude users morty', async () => {

      let matchRes = {
        rick: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: '',
                    phone: '',
                    username: 'server',
                    uid: 'ClIGgjFFwwpLMWc1611201921507210'
                  },
                date: '2019-12-16T18:50:08.743Z'
              },
                {
                  user:
                    {
                      email: 'rick@rick.rc',
                      phone: 'rick phone',
                      username: 'rick',
                      uid: 'uHsmsynqjEmnGKe1611201921507211'
                    },
                  date: '2019-12-16T18:50:08.749Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz', 'space', 'waterWorld']
            }
          }
        },
        mrShitman: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: '',
                    phone: '',
                    username: 'server',
                    uid: 'FcEKAIwnuvZYUcJ16112019215436216'
                  },
                date: '2019-12-16T18:54:37.750Z'
              },
                {
                  user:
                    {
                      email: 'mrshitman@shitman.sh',
                      phone: 'mr. shitman phone',
                      username: 'mr. shitman',
                      uid: 'UbHtILtgKDmknAO16112019215436217'
                    },
                  date: '2019-12-16T18:54:37.754Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz', 'space', 'waterWorld']
            }

          }
        }
      };


      await jrfwsSrv.sendMes({route: 'test broadcast', to: {excludeUsers: 'morty'}});
      await wait();

      objBroadcastDelPropsForMatch(globalResBrodacast);
      objBroadcastDelPropsForMatch(matchRes);
      expect(globalResBrodacast).toMatchObject(matchRes);

    });

    test('send to all exclude users rick, mr. shitman', async () => {

      let matchRes = {
        morty: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            },
            system: {
              history: [{
                user:
                  {
                    email: '',
                    phone: '',
                    username: 'server',
                    uid: 'IaaVTHnmRANpDum16112019215220182'
                  },
                date: '2019-12-16T18:52:21.722Z'
              },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'WAEVWlOtGckTirP16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.726Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz', 'space', 'waterWorld']
            }
          }
        },
        mortyOne: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: '',
                    phone: '',
                    username: 'server',
                    uid: 'PlmODTUiNCwEELB16112019215321189'
                  },
                date: '2019-12-16T18:53:22.721Z'
              },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'xeXIljZYDPnVYuh16112019215321189'
                    },
                  date: '2019-12-16T18:53:22.724Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz', 'space', 'waterWorld']
            }
          }
        }
      };


      await jrfwsSrv.sendMes({
        route: 'test broadcast', to: {
          excludeUsers: [jrfwsClientMrShitman.user, 'rick']
        }
      });
      await wait();

      objBroadcastDelPropsForMatch(globalResBrodacast);
      objBroadcastDelPropsForMatch(matchRes);
      expect(globalResBrodacast).toMatchObject(matchRes);

    });

    test('send to groups megaBrainzzz, exclude users rick', async () => {

      let matchRes = {
        morty: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            },
            system: {
              history: [{
                user:
                  {
                    email: '',
                    phone: '',
                    username: 'server',
                    uid: 'IaaVTHnmRANpDum16112019215220182'
                  },
                date: '2019-12-16T18:52:21.722Z'
              },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'WAEVWlOtGckTirP16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.726Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz']
            }
          }
        },
        mortyOne: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: '',
                    phone: '',
                    username: 'server',
                    uid: 'PlmODTUiNCwEELB16112019215321189'
                  },
                date: '2019-12-16T18:53:22.721Z'
              },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'xeXIljZYDPnVYuh16112019215321189'
                    },
                  date: '2019-12-16T18:53:22.724Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz']
            }
          }
        },
        mrShitman: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: '',
                    phone: '',
                    username: 'server',
                    uid: 'FcEKAIwnuvZYUcJ16112019215436216'
                  },
                date: '2019-12-16T18:54:37.750Z'
              },
                {
                  user:
                    {
                      email: 'mrshitman@shitman.sh',
                      phone: 'mr. shitman phone',
                      username: 'mr. shitman',
                      uid: 'UbHtILtgKDmknAO16112019215436217'
                    },
                  date: '2019-12-16T18:54:37.754Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz']
            }

          }
        }
      };


      await jrfwsSrv.sendMes({
        route: 'test broadcast',
        to: {
          groups: 'megaBrainzzz',
          excludeUsers: 'rick'
        }
      });
      await wait();

      objBroadcastDelPropsForMatch(globalResBrodacast);
      objBroadcastDelPropsForMatch(matchRes);
      expect(globalResBrodacast).toMatchObject(matchRes);

    });

    test('send to groups megaBrainzzz, space, users morty, exclude users rick', async () => {

      let matchRes = {
        morty: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            },
            system: {
              history: [{
                user:
                  {
                    email: '',
                    phone: '',
                    username: 'server',
                    uid: 'IaaVTHnmRANpDum16112019215220182'
                  },
                date: '2019-12-16T18:52:21.722Z'
              },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'WAEVWlOtGckTirP16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.726Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz']
            }
          }
        },
        mortyOne: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: '',
                    phone: '',
                    username: 'server',
                    uid: 'PlmODTUiNCwEELB16112019215321189'
                  },
                date: '2019-12-16T18:53:22.721Z'
              },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'xeXIljZYDPnVYuh16112019215321189'
                    },
                  date: '2019-12-16T18:53:22.724Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: '',
                  phone: '',
                  username: 'server',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz']
            }
          }
        }
      };


      await jrfwsSrv.sendMes({
        route: 'test broadcast',
        to: {
          groups: 'megaBrainzzz',
          users: 'morty',
          excludeUsers: 'rick'
        }
      });
      await wait();

      objBroadcastDelPropsForMatch(globalResBrodacast);
      objBroadcastDelPropsForMatch(matchRes);
      expect(globalResBrodacast).toMatchObject(matchRes);

    });

  });

  describe('client', () => {

    test('send to all', async () => {

      let matchRes = {
        morty: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            },
            system: {
              history: [{
                user:
                  {
                    email: 'rick@rick.rc',
                    phone: 'rick phone',
                    username: 'rick',
                    uid: 'IaaVTHnmRANpDum16112019215220182'
                  },
                date: '2019-12-16T18:52:21.722Z'
              },
                {
                  user:
                    {
                      email: '',
                      phone: '',
                      username: 'server',
                      uid: 'IaaVTHnmRANpDum16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.722Z'
                },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'WAEVWlOtGckTirP16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.726Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: 'rick@rick.rc',
                  phone: 'rick phone',
                  username: 'rick',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz', 'space', 'waterWorld']
            }
          }
        },
        mortyOne: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: 'rick@rick.rc',
                    phone: 'rick phone',
                    username: 'rick',
                    uid: 'PlmODTUiNCwEELB16112019215321189'
                  },
                date: '2019-12-16T18:53:22.721Z'
              },
                {
                  user:
                    {
                      email: '',
                      phone: '',
                      username: 'server',
                      uid: 'IaaVTHnmRANpDum16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.722Z'
                },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'xeXIljZYDPnVYuh16112019215321189'
                    },
                  date: '2019-12-16T18:53:22.724Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: 'rick@rick.rc',
                  phone: 'rick phone',
                  username: 'rick',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz', 'space', 'waterWorld']
            }
          }
        },
        mrShitman: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: 'rick@rick.rc',
                    phone: 'rick phone',
                    username: 'rick',
                    uid: 'FcEKAIwnuvZYUcJ16112019215436216'
                  },
                date: '2019-12-16T18:54:37.750Z'
              },
                {
                  user:
                    {
                      email: '',
                      phone: '',
                      username: 'server',
                      uid: 'IaaVTHnmRANpDum16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.722Z'
                },
                {
                  user:
                    {
                      email: 'mrshitman@shitman.sh',
                      phone: 'mr. shitman phone',
                      username: 'mr. shitman',
                      uid: 'UbHtILtgKDmknAO16112019215436217'
                    },
                  date: '2019-12-16T18:54:37.754Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: 'rick@rick.rc',
                  phone: 'rick phone',
                  username: 'rick',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz', 'space', 'waterWorld']
            }

          }
        }
      };

      await jrfwsClientRick.sendMes({
        route: 'test broadcast',
        data: 'data',
        to: {}
      });
      await wait();

      objBroadcastDelPropsForMatch(globalResBrodacast);
      objBroadcastDelPropsForMatch(matchRes);
      expect(globalResBrodacast).toMatchObject(matchRes);

    });

    test('send to all mee to', async () => {

      let matchRes = {
        rick: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            },
            system: {
              history: [{
                user:
                  {
                    email: 'rick@rick.rc',
                    phone: 'rick phone',
                    username: 'rick',
                    uid: 'IaaVTHnmRANpDum16112019215220182'
                  },
                date: '2019-12-16T18:52:21.722Z'
              },
                {
                  user:
                    {
                      email: '',
                      phone: '',
                      username: 'server',
                      uid: 'IaaVTHnmRANpDum16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.722Z'
                },
                {
                  user:
                    {
                      email: 'rick@rick.rc',
                      phone: 'rick phone',
                      username: 'rick',
                      uid: 'WAEVWlOtGckTirP16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.726Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: 'rick@rick.rc',
                  phone: 'rick phone',
                  username: 'rick',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz', 'space', 'waterWorld']
            }
          }
        },
        morty: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            },
            system: {
              history: [{
                user:
                  {
                    email: 'rick@rick.rc',
                    phone: 'rick phone',
                    username: 'rick',
                    uid: 'IaaVTHnmRANpDum16112019215220182'
                  },
                date: '2019-12-16T18:52:21.722Z'
              },
                {
                  user:
                    {
                      email: '',
                      phone: '',
                      username: 'server',
                      uid: 'IaaVTHnmRANpDum16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.722Z'
                },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'WAEVWlOtGckTirP16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.726Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: 'rick@rick.rc',
                  phone: 'rick phone',
                  username: 'rick',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz', 'space', 'waterWorld']
            }
          }
        },
        mortyOne: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: 'rick@rick.rc',
                    phone: 'rick phone',
                    username: 'rick',
                    uid: 'PlmODTUiNCwEELB16112019215321189'
                  },
                date: '2019-12-16T18:53:22.721Z'
              },
                {
                  user:
                    {
                      email: '',
                      phone: '',
                      username: 'server',
                      uid: 'IaaVTHnmRANpDum16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.722Z'
                },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'xeXIljZYDPnVYuh16112019215321189'
                    },
                  date: '2019-12-16T18:53:22.724Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: 'rick@rick.rc',
                  phone: 'rick phone',
                  username: 'rick',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz', 'space', 'waterWorld']
            }
          }
        },
        mrShitman: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: 'rick@rick.rc',
                    phone: 'rick phone',
                    username: 'rick',
                    uid: 'FcEKAIwnuvZYUcJ16112019215436216'
                  },
                date: '2019-12-16T18:54:37.750Z'
              },
                {
                  user:
                    {
                      email: '',
                      phone: '',
                      username: 'server',
                      uid: 'IaaVTHnmRANpDum16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.722Z'
                },
                {
                  user:
                    {
                      email: 'mrshitman@shitman.sh',
                      phone: 'mr. shitman phone',
                      username: 'mr. shitman',
                      uid: 'UbHtILtgKDmknAO16112019215436217'
                    },
                  date: '2019-12-16T18:54:37.754Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: 'rick@rick.rc',
                  phone: 'rick phone',
                  username: 'rick',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz', 'space', 'waterWorld']
            }

          }
        }
      };

      await jrfwsClientRick.sendMes({
        route: 'test broadcast',
        data: 'data',
        to: {
          meToo: true
        }
      });
      await wait();

      objBroadcastDelPropsForMatch(globalResBrodacast);
      objBroadcastDelPropsForMatch(matchRes);
      expect(globalResBrodacast).toMatchObject(matchRes);

    });

    test('send to group megaBrainzzz', async () => {

      let matchRes = {
        morty: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            },
            system: {
              history: [{
                user:
                  {
                    email: 'rick@rick.rc',
                    phone: 'rick phone',
                    username: 'rick',
                    uid: 'IaaVTHnmRANpDum16112019215220182'
                  },
                date: '2019-12-16T18:52:21.722Z'
              },
                {
                  user:
                    {
                      email: '',
                      phone: '',
                      username: 'server',
                      uid: 'IaaVTHnmRANpDum16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.722Z'
                },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'WAEVWlOtGckTirP16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.726Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: 'rick@rick.rc',
                  phone: 'rick phone',
                  username: 'rick',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz']
            }
          }
        },
        mortyOne: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: 'rick@rick.rc',
                    phone: 'rick phone',
                    username: 'rick',
                    uid: 'PlmODTUiNCwEELB16112019215321189'
                  },
                date: '2019-12-16T18:53:22.721Z'
              },
                {
                  user:
                    {
                      email: '',
                      phone: '',
                      username: 'server',
                      uid: 'IaaVTHnmRANpDum16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.722Z'
                },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'xeXIljZYDPnVYuh16112019215321189'
                    },
                  date: '2019-12-16T18:53:22.724Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: 'rick@rick.rc',
                  phone: 'rick phone',
                  username: 'rick',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz']
            }
          }
        },
        mrShitman: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: 'rick@rick.rc',
                    phone: 'rick phone',
                    username: 'rick',
                    uid: 'FcEKAIwnuvZYUcJ16112019215436216'
                  },
                date: '2019-12-16T18:54:37.750Z'
              },
                {
                  user:
                    {
                      email: '',
                      phone: '',
                      username: 'server',
                      uid: 'IaaVTHnmRANpDum16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.722Z'
                },
                {
                  user:
                    {
                      email: 'mrshitman@shitman.sh',
                      phone: 'mr. shitman phone',
                      username: 'mr. shitman',
                      uid: 'UbHtILtgKDmknAO16112019215436217'
                    },
                  date: '2019-12-16T18:54:37.754Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: 'rick@rick.rc',
                  phone: 'rick phone',
                  username: 'rick',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz']
            }

          }
        }
      };

      await jrfwsClientRick.sendMes({route: 'test broadcast', to: {groups: 'megaBrainzzz'}});
      await wait();

      objBroadcastDelPropsForMatch(globalResBrodacast);
      objBroadcastDelPropsForMatch(matchRes);
      expect(globalResBrodacast).toMatchObject(matchRes);

    });

    test('send to group waterWorld', async () => {

      let matchRes = {
        morty: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            },
            system: {
              history: [{
                user:
                  {
                    email: 'rick@rick.rc',
                    phone: 'rick phone',
                    username: 'rick',
                    uid: 'IaaVTHnmRANpDum16112019215220182'
                  },
                date: '2019-12-16T18:52:21.722Z'
              },
                {
                  user:
                    {
                      email: '',
                      phone: '',
                      username: 'server',
                      uid: 'IaaVTHnmRANpDum16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.722Z'
                },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'WAEVWlOtGckTirP16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.726Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: 'rick@rick.rc',
                  phone: 'rick phone',
                  username: 'rick',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['waterWorld']
            }
          }
        },
        mortyOne: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: 'rick@rick.rc',
                    phone: 'rick phone',
                    username: 'rick',
                    uid: 'PlmODTUiNCwEELB16112019215321189'
                  },
                date: '2019-12-16T18:53:22.721Z'
              },
                {
                  user:
                    {
                      email: '',
                      phone: '',
                      username: 'server',
                      uid: 'IaaVTHnmRANpDum16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.722Z'
                },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'xeXIljZYDPnVYuh16112019215321189'
                    },
                  date: '2019-12-16T18:53:22.724Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: 'rick@rick.rc',
                  phone: 'rick phone',
                  username: 'rick',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['waterWorld']
            }
          }
        },
      };


      await jrfwsClientRick.sendMes({route: 'test broadcast', to: {groups: 'waterWorld'}});
      await wait();

      objBroadcastDelPropsForMatch(globalResBrodacast);
      objBroadcastDelPropsForMatch(matchRes);
      expect(globalResBrodacast).toMatchObject(matchRes);

    });

    test('send to users rick', async () => {

      let matchRes = {
        rick: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            },
            system: {
              history: [{
                user:
                  {
                    email: 'mrshitman@shitman.sh',
                    phone: 'mr. shitman phone',
                    username: 'mr. shitman',
                    uid: 'IaaVTHnmRANpDum16112019215220182'
                  },
                date: '2019-12-16T18:52:21.722Z'
              },
                {
                  user:
                    {
                      email: '',
                      phone: '',
                      username: 'server',
                      uid: 'IaaVTHnmRANpDum16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.722Z'
                },
                {
                  user:
                    {
                      email: 'rick@rick.rc',
                      phone: 'rick phone',
                      username: 'rick',
                      uid: 'WAEVWlOtGckTirP16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.726Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: 'mrshitman@shitman.sh',
                  phone: 'mr. shitman phone',
                  username: 'mr. shitman',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: null
            }
          }
        }
      };


      await jrfwsClientMrShitman.sendMes({route: 'test broadcast', to: {users: 'rick'}});
      await wait();

      objBroadcastDelPropsForMatch(globalResBrodacast);
      objBroadcastDelPropsForMatch(matchRes);
      expect(globalResBrodacast).toMatchObject(matchRes);

    });

    test('send to users morty', async () => {

      let matchRes = {
        morty: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            },
            system: {
              history: [{
                user:
                  {
                    email: 'rick@rick.rc',
                    phone: 'rick phone',
                    username: 'rick',
                    uid: 'IaaVTHnmRANpDum16112019215220182'
                  },
                date: '2019-12-16T18:52:21.722Z'
              },
                {
                  user:
                    {
                      email: '',
                      phone: '',
                      username: 'server',
                      uid: 'IaaVTHnmRANpDum16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.722Z'
                },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'WAEVWlOtGckTirP16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.726Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: 'rick@rick.rc',
                  phone: 'rick phone',
                  username: 'rick',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: null
            }
          }
        },
        mortyOne: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: 'rick@rick.rc',
                    phone: 'rick phone',
                    username: 'rick',
                    uid: 'PlmODTUiNCwEELB16112019215321189'
                  },
                date: '2019-12-16T18:53:22.721Z'
              },
                {
                  user:
                    {
                      email: '',
                      phone: '',
                      username: 'server',
                      uid: 'IaaVTHnmRANpDum16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.722Z'
                },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'xeXIljZYDPnVYuh16112019215321189'
                    },
                  date: '2019-12-16T18:53:22.724Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: 'rick@rick.rc',
                  phone: 'rick phone',
                  username: 'rick',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: null
            }
          }
        },
      };


      await jrfwsClientRick.sendMes({route: 'test broadcast', to: {users: [jrfwsClientMorty.user]}});
      await wait();

      objBroadcastDelPropsForMatch(globalResBrodacast);
      objBroadcastDelPropsForMatch(matchRes);
      expect(globalResBrodacast).toMatchObject(matchRes);

    });

    test('send all exclude groups waterWorld', async () => {

      let matchRes = {
        morty: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            },
            system: {
              history: [{
                user:
                  {
                    email: 'rick@rick.rc',
                    phone: 'rick phone',
                    username: 'rick',
                    uid: 'IaaVTHnmRANpDum16112019215220182'
                  },
                date: '2019-12-16T18:52:21.722Z'
              },
                {
                  user:
                    {
                      email: '',
                      phone: '',
                      username: 'server',
                      uid: 'IaaVTHnmRANpDum16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.722Z'
                },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'WAEVWlOtGckTirP16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.726Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: 'rick@rick.rc',
                  phone: 'rick phone',
                  username: 'rick',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz', 'space']
            }
          }
        },
        mortyOne: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: 'rick@rick.rc',
                    phone: 'rick phone',
                    username: 'rick',
                    uid: 'PlmODTUiNCwEELB16112019215321189'
                  },
                date: '2019-12-16T18:53:22.721Z'
              },
                {
                  user:
                    {
                      email: '',
                      phone: '',
                      username: 'server',
                      uid: 'IaaVTHnmRANpDum16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.722Z'
                },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'xeXIljZYDPnVYuh16112019215321189'
                    },
                  date: '2019-12-16T18:53:22.724Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: 'rick@rick.rc',
                  phone: 'rick phone',
                  username: 'rick',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz', 'space']
            }
          }
        },
        mrShitman: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: 'rick@rick.rc',
                    phone: 'rick phone',
                    username: 'rick',
                    uid: 'FcEKAIwnuvZYUcJ16112019215436216'
                  },
                date: '2019-12-16T18:54:37.750Z'
              },
                {
                  user:
                    {
                      email: '',
                      phone: '',
                      username: 'server',
                      uid: 'IaaVTHnmRANpDum16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.722Z'
                },
                {
                  user:
                    {
                      email: 'mrshitman@shitman.sh',
                      phone: 'mr. shitman phone',
                      username: 'mr. shitman',
                      uid: 'UbHtILtgKDmknAO16112019215436217'
                    },
                  date: '2019-12-16T18:54:37.754Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: 'rick@rick.rc',
                  phone: 'rick phone',
                  username: 'rick',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz', 'space']
            }

          }
        }
      };


      await jrfwsClientRick.sendMes({route: 'test broadcast', to: {excludeGroups: 'waterWorld'}});
      await wait();

      objBroadcastDelPropsForMatch(globalResBrodacast);
      objBroadcastDelPropsForMatch(matchRes);
      expect(globalResBrodacast).toMatchObject(matchRes);

    });

    test('send all exclude groups megaBrainzzz, space', async () => {

      let matchRes = {
        morty: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            },
            system: {
              history: [{
                user:
                  {
                    email: 'rick@rick.rc',
                    phone: 'rick phone',
                    username: 'rick',
                    uid: 'IaaVTHnmRANpDum16112019215220182'
                  },
                date: '2019-12-16T18:52:21.722Z'
              },
                {
                  user:
                    {
                      email: '',
                      phone: '',
                      username: 'server',
                      uid: 'IaaVTHnmRANpDum16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.722Z'
                },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'WAEVWlOtGckTirP16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.726Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: 'rick@rick.rc',
                  phone: 'rick phone',
                  username: 'rick',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['waterWorld']
            }
          }
        },
        mortyOne: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: 'rick@rick.rc',
                    phone: 'rick phone',
                    username: 'rick',
                    uid: 'PlmODTUiNCwEELB16112019215321189'
                  },
                date: '2019-12-16T18:53:22.721Z'
              },
                {
                  user:
                    {
                      email: '',
                      phone: '',
                      username: 'server',
                      uid: 'IaaVTHnmRANpDum16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.722Z'
                },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'xeXIljZYDPnVYuh16112019215321189'
                    },
                  date: '2019-12-16T18:53:22.724Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: 'rick@rick.rc',
                  phone: 'rick phone',
                  username: 'rick',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['waterWorld']
            }
          }
        },
      };


      await jrfwsClientRick.sendMes({route: 'test broadcast', to: {excludeGroups: ['megaBrainzzz', {name: 'space'}]}});
      await wait();

      objBroadcastDelPropsForMatch(globalResBrodacast);
      objBroadcastDelPropsForMatch(matchRes);
      expect(globalResBrodacast).toMatchObject(matchRes);

    });

    test('send to all exclude users morty', async () => {

      let matchRes = {
        mrShitman: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: 'rick@rick.rc',
                    phone: 'rick phone',
                    username: 'rick',
                    uid: 'FcEKAIwnuvZYUcJ16112019215436216'
                  },
                date: '2019-12-16T18:54:37.750Z'
              },
                {
                  user:
                    {
                      email: '',
                      phone: '',
                      username: 'server',
                      uid: 'IaaVTHnmRANpDum16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.722Z'
                },
                {
                  user:
                    {
                      email: 'mrshitman@shitman.sh',
                      phone: 'mr. shitman phone',
                      username: 'mr. shitman',
                      uid: 'UbHtILtgKDmknAO16112019215436217'
                    },
                  date: '2019-12-16T18:54:37.754Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: 'rick@rick.rc',
                  phone: 'rick phone',
                  username: 'rick',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz', 'space', 'waterWorld']
            }

          }
        }
      };


      await jrfwsClientRick.sendMes({route: 'test broadcast', to: {excludeUsers: 'morty'}});
      await wait();

      objBroadcastDelPropsForMatch(globalResBrodacast);
      objBroadcastDelPropsForMatch(matchRes);
      expect(globalResBrodacast).toMatchObject(matchRes);

    });

    test('send to all exclude users rick, mr. shitman', async () => {

      let matchRes = {
        morty: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            },
            system: {
              history: [{
                user:
                  {
                    email: 'rick@rick.rc',
                    phone: 'rick phone',
                    username: 'rick',
                    uid: 'IaaVTHnmRANpDum16112019215220182'
                  },
                date: '2019-12-16T18:52:21.722Z'
              },
                {
                  user:
                    {
                      email: '',
                      phone: '',
                      username: 'server',
                      uid: 'IaaVTHnmRANpDum16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.722Z'
                },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'WAEVWlOtGckTirP16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.726Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: 'rick@rick.rc',
                  phone: 'rick phone',
                  username: 'rick',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz', 'space', 'waterWorld']
            }
          }
        },
        mortyOne: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: 'rick@rick.rc',
                    phone: 'rick phone',
                    username: 'rick',
                    uid: 'PlmODTUiNCwEELB16112019215321189'
                  },
                date: '2019-12-16T18:53:22.721Z'
              },
                {
                  user:
                    {
                      email: '',
                      phone: '',
                      username: 'server',
                      uid: 'IaaVTHnmRANpDum16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.722Z'
                },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'xeXIljZYDPnVYuh16112019215321189'
                    },
                  date: '2019-12-16T18:53:22.724Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: 'rick@rick.rc',
                  phone: 'rick phone',
                  username: 'rick',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz', 'space', 'waterWorld']
            }
          }
        },
      };


      await jrfwsClientRick.sendMes({
        route: 'test broadcast', to: {
          excludeUsers: [jrfwsClientMrShitman.user, 'rick']
        }
      });
      await wait();

      objBroadcastDelPropsForMatch(globalResBrodacast);
      objBroadcastDelPropsForMatch(matchRes);
      expect(globalResBrodacast).toMatchObject(matchRes);

    });

    test('send to groups megaBrainzzz, exclude users rick', async () => {

      let matchRes = {
        morty: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            },
            system: {
              history: [{
                user:
                  {
                    email: 'mrshitman@shitman.sh',
                    phone: 'mr. shitman phone',
                    username: 'mr. shitman',
                    uid: 'IaaVTHnmRANpDum16112019215220182'
                  },
                date: '2019-12-16T18:52:21.722Z'
              },
                {
                  user:
                    {
                      email: '',
                      phone: '',
                      username: 'server',
                      uid: 'IaaVTHnmRANpDum16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.722Z'
                },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'WAEVWlOtGckTirP16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.726Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: 'mrshitman@shitman.sh',
                  phone: 'mr. shitman phone',
                  username: 'mr. shitman',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz']
            }
          }
        },
        mortyOne: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: 'mrshitman@shitman.sh',
                    phone: 'mr. shitman phone',
                    username: 'mr. shitman',
                    uid: 'PlmODTUiNCwEELB16112019215321189'
                  },
                date: '2019-12-16T18:53:22.721Z'
              },
                {
                  user:
                    {
                      email: '',
                      phone: '',
                      username: 'server',
                      uid: 'IaaVTHnmRANpDum16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.722Z'
                },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'xeXIljZYDPnVYuh16112019215321189'
                    },
                  date: '2019-12-16T18:53:22.724Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: 'mrshitman@shitman.sh',
                  phone: 'mr. shitman phone',
                  username: 'mr. shitman',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz']
            }
          }
        },
      };


      await jrfwsClientMrShitman.sendMes({
        route: 'test broadcast',
        to: {
          groups: 'megaBrainzzz',
          excludeUsers: 'rick'
        }
      });
      await wait();

      objBroadcastDelPropsForMatch(globalResBrodacast);
      objBroadcastDelPropsForMatch(matchRes);
      expect(globalResBrodacast).toMatchObject(matchRes);

    });

    test('send to groups megaBrainzzz, space, users morty, exclude users rick', async () => {

      let matchRes = {
        morty: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            },
            system: {
              history: [{
                user:
                  {
                    email: 'mrshitman@shitman.sh',
                    phone: 'mr. shitman phone',
                    username: 'mr. shitman',
                    uid: 'IaaVTHnmRANpDum16112019215220182'
                  },
                date: '2019-12-16T18:52:21.722Z'
              },
                {
                  user:
                    {
                      email: '',
                      phone: '',
                      username: 'server',
                      uid: 'IaaVTHnmRANpDum16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.722Z'
                },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'WAEVWlOtGckTirP16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.726Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: 'mrshitman@shitman.sh',
                  phone: 'mr. shitman phone',
                  username: 'mr. shitman',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz']
            }
          }
        },
        mortyOne: {
          gotMes: true,
          data: {
            route: 'test broadcast',
            act: null,
            uid: null,
            user: {
              email: '',
              phone: '',
              username: 'server',
              uid: 'PahjwMXZfaWLEPN16112019214327265'
            }
            ,
            system: {
              history: [{
                user:
                  {
                    email: 'mrshitman@shitman.sh',
                    phone: 'mr. shitman phone',
                    username: 'mr. shitman',
                    uid: 'PlmODTUiNCwEELB16112019215321189'
                  },
                date: '2019-12-16T18:53:22.721Z'
              },
                {
                  user:
                    {
                      email: '',
                      phone: '',
                      username: 'server',
                      uid: 'IaaVTHnmRANpDum16112019215220182'
                    },
                  date: '2019-12-16T18:52:21.722Z'
                },
                {
                  user:
                    {
                      email: 'morty@morty.mr',
                      phone: 'morty phone',
                      username: 'morty',
                      uid: 'xeXIljZYDPnVYuh16112019215321189'
                    },
                  date: '2019-12-16T18:53:22.724Z'
                }]
            },
            isRes: false,
            from: {
              fromUser:
                {
                  email: 'mrshitman@shitman.sh',
                  phone: 'mr. shitman phone',
                  username: 'mr. shitman',
                  uid: 'PahjwMXZfaWLEPN16112019214327265'
                },
              groups: ['megaBrainzzz']
            }
          }
        },
      };


      await jrfwsClientMrShitman.sendMes({
        route: 'test broadcast',
        to: {
          groups: 'megaBrainzzz',
          users: 'morty',
          excludeUsers: 'rick'
        }
      });
      await wait();

      objBroadcastDelPropsForMatch(globalResBrodacast);
      objBroadcastDelPropsForMatch(matchRes);
      expect(globalResBrodacast).toMatchObject(matchRes);

    });

  });

});
