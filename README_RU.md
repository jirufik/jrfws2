# jrfws2

**jrfws2**  - это **async/await** пакет для создания **api** реального времени, на основе **websockets**. Является оберткой над легким и быстрым [ws](https://www.npmjs.com/package/ws). Может работать самостоятельно или в связке с [koa](https://www.npmjs.com/package/koa).

![jrfwslogo](jrfwslogo.png)

## Server

### Start server

```js
const {JRFWSServer} = require('jrfws2');  
const jrfwsServer = new JRFWSServer();  
  
async function initServer() {

  /// any code	
  
  let opt = {  
  port: 3003  
  };  
  /// default port: 3001  
  await jrfwsServer.startServer(opt);  
}  
  
initServer();
```

Более подробно про **opt** сервера можно прочитать из официальной документации [ws](https://github.com/websockets/ws/blob/master/doc/ws.md#new-websocketserveroptions-callback)

### Start server with Koa

```js
const Koa = require('koa');    
const app = new Koa();  
const {JRFWSServer} = require('jrfws2');  
const jrfwsServer = new JRFWSServer();  

/// any code

/// http
jrfwsServer.attach(app);
app.listen(3001);

/// or https
jrfwsServer.attach(app, true, {
  key: fs.readFileSync(...),
  cert: fs.readFileSync(...),
  ca: fs.readFileSync(...)
});
app.listen(3001);

/// app.jrfws
```

## Client

Для установки соединения необходимо указать адрес `url`.
Можно указать параметр `reconnect` - `true` пытаться восстановить соединение с сервером, после разрыва,
`false` - не восстанавливать соединение.

```js
const {JRFWSClient} = require('jrfws2');
const jrfwsClient = new JRFWSClient();
await jrfwsClient.startClient({url: `ws://localhost:${PORT}`});

import {JRFWSBrowserClient} from 'jrfws2';
const jrfwsClient = new JRFWSBrowserClient();
await jrfwsClient.startClient({url: `ws://localhost:${PORT}`});
```

**hook** - `this.onOpen = async (args) => {};` отрабатывает при соединение с сервером.

**hook** - `this.onError = async (args) => {};` отрабатывает при ошибке соединения с сервером.

**hook** - `this.onClose = async (args) => {};` отрабатывает при закрытие соединения с сервером.

**hook** - `this.onMessage = async (args) => {};` отрабатывает при поступлении сообщнеия с сервера. 

## Routing

Для обработки входящих сообщение нужно настроить маршрутизацию. 

```js
await jrfws.route(route, act, func(data, stop));
```

| param | type | required | description |
| --- | --- | --- | --- |
| route | string |  | Путь |
| act | string |  | Действие относительно пути |
| func | function | true | Асинхронная функция принимающая: **data** - поступившие данные, **stop** - асинхронная функция, вызов которой приостановит последующий routing |

**data** состоит из 

| param | type | description |
| --- | --- | --- |
| uid | string | id входящего сообщения. Заполнен когда отправитель ждет ответ на сообщение |
| isRes | boolean | **true** - сообщения является ответом, на посланное сообщение |
| user | object | Пользователь пославший сообщение |
| data | any | Данные любого типа посланные в сообщении |
| route | string | Путь сообщения |
| act | string | Действие относительно пути сообщения |
| system | object | Системная информация сообщения |
| client | object | Клиент (клиентское соединение) который послал сообщение. Внутренний объект клиента **ws**, которому добавлен метод **sendMes**. Данный параметр доступен только на сервере. |
| from | object | Данные инициатора сообщения. Заполняется только при **broadcast**. |

Пример добаления обработчиков маршрутизации. Обработчики выполняются в той последовательности, в которой были добавлены.
Исключение системный обработчик **not found**, который всегда выполняется последним.

```js
  // Будет обрабатывать все сообщения т.к. не заданы route и act
  await jrfwsSrv.route({
          func: async ({data, stop}) => {
            
          }
        });
    
  // Будет обрабатывать все сообщения с route === 'users'
  // Останавливает дальнейшую маршрутизацию stop()
  // Если отправитель ожидает ответа на сообщение, то ему возратится 'users'
  await jrfwsSrv.route({
          route: 'users',
          func: async ({data, stop}) => {
            stop();
            return 'users';
          }
        });
    
  // Будет обрабатывать все сообщения с route === 'users' и act === 'add'
  // Отправит всем клиентам сообщение о добавлении нового пользователя to: {}
  // Если отправитель ожидает ответа на сообщение, то ему возратится добавленный пользователь
  await jrfwsSrv.route({
          route: 'users',
          act: 'add',
          func: async ({data, stop}) => {
            const user = addUser({user: data.data.user});
            await jrfwsSrv.sendMes({route: 'users', act: 'add', data: {user}, to: {}});
            return user;
          }
        });

  // Будет обрабатывать все сообщения с route === 'users' и act === 'get'
  // Такой обработчик возможен только на сервере т.к. используется data.client.sendMes 
  // Обработчик отправит сообщение клиенту обрабатываемого сообщения
  await jrfwsSrv.route({
          route: 'users',
          act: 'get',
          func: async ({data, stop}) => {
            const users = await getUsers({filter: data.data.filter});
            await data.client.sendMes({route: 'users', act: 'get', data: {users}});
          }
        });

  // Будет обрабатывать все сообщения у которых не была приостановлена маршрутизация
  // предыдущими обработчиками т.к. не заданы route и act
  await jrfwsSrv.route({
          func: async ({data, stop}) => {
            
          }
        });

  // Специалный обработчик. Будет обрабатывать сообщения для которых нет обработчиков 
  // по route и(или) act
  await jrfwsSrv.route({
          route: 'not found',
          func: async ({data, stop}) => {

          }
        });
```

## Message

Сообщение состоит из различных данных

| param | type | description |
| --- | --- | --- |
| uid | string | id входящего сообщения. Заполнен когда отправитель ждет ответ на сообщение |
| isRes | boolean | **true** - сообщения является ответом, на посланное сообщение |
| user | object | Пользователь пославший сообщение |
| data | any | Данные любого типа посланные в сообщении |
| route | string | Путь сообщения |
| act | string | Действие относительно пути сообщения |
| system | object | Системная информация сообщения |
| client | object | Клиент (клиентское соединение) который послал сообщение. Внутренний объект клиента **ws**, которому добавлен метод **sendMes**. Данный параметр доступен только на сервере. |
| from | object | Данные инициатора сообщения. Заполняется только при **broadcast**. |

**user** - Пользователь состоит из полей указанных в `jrfws.user`.

По умолчанию.

```js
this.user = {
      username: '',
      email: '',
      token: '',
      rights: null,
      phone: '',
      uid: this._generateId()
    };
```

**system** - Системная информация. Содержит массив историю сообщения `system.history`. 
В истории у пользователя удаляются конфедициальные поля перечисленные в `this.userExcludeFields = ['rights', 'token'];`

Каждые элемент истории содержит.

| param | type | description |
| --- | --- | --- |
| user | object | Пользователь обработавший сообщение |
| date | date | Дата время обработки сообщения |

```js
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
      date: '2019-12-16T18:54:37.752Z'
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
```

**from** - Данные инициатора сообщения. Заполняется только при **broadcast**. 
У пользователя удаляются конфедициальные поля перечисленные в `this.userExcludeFields = ['rights', 'token'];`

Состоит из

| param | type | description |
| --- | --- | --- |
| fromUser | object | Пользователь отправивший сообщение |
| groups | array | Массив наименований групп получателей сообщения |

```js
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
```

## Send message

Сообщение отправляется с помощью метода `jrfws.sendMes({params})`.

Параметры.

| param | type | description |
| --- | --- | --- |
| route | string | Путь |
| act | string | Действие относительно пути |
| data | any | Данные любого типа |
| awaitRes | boolean | Ждать ответ на сообщение |
| callback | function | Выполнить **callback** когда придет ответ на сообщение |
| options | object | Дополнительные опции сообщения. На данный момент есть только одна опцияя **timeout** для параметров **awaitRes** и **callback** |
| to | object | Параметры **broadcast** |
| client | object | Клиент (один из `jrfws.wss.clients`) которому требуется отправить сообщение. Данный параметр доступен только на сервере. |

### Простая отправка

Сообщение просто отправляется.

```js 
await jrfws.sendMes({route: 'users'});

await jrfws.sendMes({route: 'users', act: 'get'});

await jrfws.sendMes({route: 'users', act: 'add', data: {
  user: {username: 'rick', email: 'rick@rick.rc'}
});
```

### Ждать ответ на сообщение

Сообщение отправляется, программа ждет ответ на сообщение. 

Если время ожидания больше чем `this.timeout = 10000`, тогда ответ будет 
`error: {message: 'timeout: 10000'}` и отработает обработчик `this.onTimeout`, в который будет
 передан параметр `data`

| param | type | description |
| --- | --- | --- |
| uid | string | id сообщения |
| user | object | Пользователь пославший сообщение |
| route | string | Путь сообщения |
| act | string | Действие относительно пути сообщения |
| system | object | Системная информация сообщения |
| timeout | number | Максимальное время ожидание ответа |
| res | object | Ответ на сообщение. Будет содержать error |

```js
// set default timeout; default = 10000
jrfws.timeout = 5000;

jrfws.onTimeout = async ({data}) => {
      console.error(`Timeout: ${data.timeout} ms; uid: ${data.uid}; route: ${data.route}; act: ${data.act}`);
    };

// default timeout
const res = await jrfws.sendMes({route: 'users', awaitRes: true});

// custom timeout
const res = await jrfws.sendMes({route: 'users', awaitRes: true, options: {timeout: 1000}});
```

### Callback

Сообщение отправляется. Callback ожидает ответ `data`.

| param | type | description |
| --- | --- | --- |
| uid | string | id входящего сообщения. Заполнен когда отправитель ждет ответ на сообщение |
| isRes | boolean | **true** - сообщения является ответом, на посланное сообщение |
| user | object | Пользователь пославший сообщение |
| data | any | Данные любого типа посланные в сообщении |
| route | string | Путь сообщения |
| act | string | Действие относительно пути сообщения |
| system | object | Системная информация сообщения |
  

Если время ожидания больше чем `this.timeout = 10000`, тогда ответ будет 
`error: {message: 'timeout: 10000'}` и отработает обработчик `this.onTimeout`, в который будет
 передан параметр `data`

| param | type | description |
| --- | --- | --- |
| uid | string | id сообщения |
| user | object | Пользователь пославший сообщение |
| route | string | Путь сообщения |
| act | string | Действие относительно пути сообщения |
| system | object | Системная информация сообщения |
| timeout | number | Максимальное время ожидание ответа |
| res | object | Ответ на сообщение. Будет содержать error |

```js
// set default timeout; default = 10000
jrfws.timeout = 5000;

jrfws.onTimeout = async ({data}) => {
      console.error(`Timeout: ${data.timeout} ms; uid: ${data.uid}; route: ${data.route}; act: ${data.act}`);
    };

async function callback({data}) {
  console.log(JSON.stringify(data));
}

// default timeout
const res = await jrfws.sendMes({route: 'users', callback});

// custom timeout
const res = await jrfws.sendMes({route: 'users', callback, options: {timeout: 1000}});
```

### Отправить broadcast

Для **broadcast** сообщения необходимо передать параметр `to`. Если параметр пустой,
то сообщение будет отправлено всем пользователям. Если у пользователя получателя, 
несколько клиентских соединений, то все клиенты пользователя получат сообщение. 
Идентификация пользователя `this.user` происходит по уникальным полям `this.userSearchFields`.
В сообщении посланом клиенту, у всех объектов `user` будут удалены конфедициальные поля `this.userExcludeFields = ['rights', 'token'];`.
  
| param | type | description |
| --- | --- | --- |
| users | string | Пользователь который получит сообщение. Строковое значение одного из уникальных полей пользователя `this.userSearchFields = ['username', 'email', 'phone']` |
| users | array | Пользователи которые получат сообщение. Могут быть строковые значения уникальных полей пользователя, так и объекты пользователей |
| excludeUsers | string | Исключить пользователя из получателей. Строковое значение одного из уникальных полей пользователя `this.userSearchFields = ['username', 'email', 'phone']` |
| excludeUsers | array | Исключить пользователей из получателей. Могут быть строковые значения уникальных полей пользователя, так и объекты пользователей |
| groups | string | Имя группы, пользователи которой получат сообщение |
| groups | array | Группы, пользователи которых получат сообщения. Могут быть как строки так и объекты групп |
| excludeGroups | string | Имя группы, которую необходимо исключить из получателей |
| excludeGroups | array | Группы, которые необходимо исключить из получателей. Могут быть как строки так и объекты групп |
| meeTo | boolean | **true** - отправить сообщение себе |

```js
// send all users
await jrfws.sendMes({data: 'hello', to: {}});

await jrfws.sendMes({
  route: 'chat',
  act: 'say',
  data: 'hello',
  to: {
    users: 'rick'
  }
});

await jrfws.sendMes({
  route: 'chat',
  act: 'say',
  data: 'hello',
  to: {
    users: ['rick', {email: 'morty@morty.mr'}]
  }
});

await jrfws.sendMes({
  route: 'chat',
  act: 'say',
  data: 'hello',
  to: {
    excludUsers: ['rick', {email: 'morty@morty.mr'}]
  }
});

await jrfws.sendMes({
  route: 'chat',
  act: 'say',
  data: 'hello',
  to: {
    groups: ['space', {name: 'waterLand'}],
    excludUsers: ['rick', {email: 'morty@morty.mr'}]
  }
});
```

**hook** - `this.onBeforeSendMesTo` отрабатывает перед отправкой сообщения от сервера к клиенту.
Если возвращает `true`, то сообщнеие отправляется. Параметры `client, from, to, mes`.

**hook** - `this.onAfterSendMesTo` отрабатывает после отправки сообщения от сервера к клиенту. 
Параметры `client, from, to, mes`.

### Hooks params

| param | type | description |
| --- | --- | --- |
| client | object | Клиентское соединение которому отправляется сообщение |
| from | object | Пользователь отправивший сообщение `fromUser`. Группы для которых предназначается сообщение `groups` |
| to | object | Параметры broadcast |
| mes | object | Сообщение для клиента |

## Groups

Группы содержат пользователей, которым будут отправляться сообщения broadcast.

Методы `add, get, del` доступны на сервере и клиенте. Сами же группы хранятся на сервере,
так же на сервере доступны хуки.

### addGroup

Добавить группу(ы), вернет `true` или `false`. Принимает параметр `group` может 
содержать массив групп.

| param | type | description |
| --- | --- | --- |
| name | string | Имя группы. должно быть уникальным |
| description | any | Описание группы |

```js
const res = await jrfws.addGroup({group: {name: 'space'}});

const res = await jrfws.addGroup({group: [{name: 'space'}, {name: 'waterWorld'}]});
```

**hook** - `this.onBeforeAddGroup` отрабатывает перед добавлением группы.
Если возвращает `true`, то группа добавляется. Параметры `mes, group, mesSendServer`.

**hook** - `this.onAfterAddGroup` отрабатывает после добавления группы.
Если возвращает не `true`, то группа удаляется. Параметры `mes, group, mesSendServer`.

### delGroup

Удалить группу(ы), вернет `true` или `false`. Принимает параметр `group`, может 
содержать массив групп.

| param | type | description |
| --- | --- | --- |
| group | string | Имя группы |
| group | object | Объект группы |
| group | array | Массив групп |

```js
const res = await jrfws.delGroup({group: 'space'});

const res = await jrfws.delGroup({group: {name: 'space'}});

const res = await jrfws.delGroup({group: ['space', {name: 'waterWorld'}]});
```

**hook** - `this.onBeforeDelGroup` отрабатывает перед удалением группы.
Если возвращает `true`, то группа удаляется. Параметры `mes, group, mesSendServer`.

**hook** - `this.onAfterDelGroup` отрабатывает полсе удаления группы. 
Параметры `mes, group, mesSendServer`.

### getGroups

Получить группы.

```js
const groups = await jrfws.getGroups();
```

**hook** - `this.onBeforeGetGroup` отрабатывает перед получением групп.
Если возвращает `true`, то список групп сформируется. Параметры `mes, mesSendServer`.

**hook** - `this.onAfterGetGroup` отрабатывает после получения групп. 
Параметры `mes, groups, mesSendServer`.

### Hooks params

| param | type | description |
| --- | --- | --- |
| mes | object | Сообщение инициатор действия |
| group | array/string/object | Группа |
| groups | object | Группы `{group1: {name: 'group1', description: '', users:[]}, group2: {name: 'group2', description: '', users:[]}}` |
| mesSendServer | boolean | `true` - инициатор действия сервер, `false` - инициатор действия клиент |

### addUserToGroup

Добавить пользователя в группу. Вернет `true` или `false`. Принимает параметры `group` и `user`.

| param | type | description |
| --- | --- | --- |
| user | string/object | Пользователь которого необходимо добавить в группу |
| group | string/object | Группа в которую добавляется пользователь |

**hook** - `this.onBeforeAddUserToGroup` отрабатывает перед добавлением пользователя.
Если возвращает `true`, то пользователь добавляется в группу. Параметры `mes, group, user, clients, mesSendServer`.

**hook** - `this.onAfterAddUserToGroup` отрабатывает после добавления пользователя. 
Параметры `mes, group, user, clients, mesSendServer`.

### delUserToGroup

Удалить пользователя из группу. Вернет `true` или `false`. Принимает параметры `group` и `user`.

| param | type | description |
| --- | --- | --- |
| user | string/object | Пользователь которого необходимо удалить из группы |
| group | string/object | Группа из которой удаляется пользователь |

**hook** - `this.onBeforeDelUserToGroup` отрабатывает перед удалением пользователя.
Если возвращает `true`, то пользователь удаляется из группы. Параметры `mes, group, user, clients, mesSendServer`.

**hook** - `this.onAfterDelUserToGroup` отрабатывает после удаления пользователя. 
Параметры `mes, group, user, clients, mesSendServer`.

### Hooks params

| param | type | description |
| --- | --- | --- |
| mes | object | Сообщение инициатор действия |
| group | string/object | Группа |
| user | string/object | Пользователь |
| clients | set | Коллекция клиентских соединений `this.wss.clients` |
| mesSendServer | boolean | `true` - инициатор действия сервер, `false` - инициатор действия клиент |

## User

**User** - это объект пользователь, идентифицирующий сервер и клиентское соединение.
У одного пользователя одновременно может быть несколько клиентских соединений. 
Например соединения с разных устройств.  
 
По умолчанию пользователь имеет следующие поля. Но их можно изменять.

```js
this.user = {
      username: '',
      email: '',
      token: '',
      rights: null,
      phone: '',
      uid: this._generateId()
    };
```

Для идентификации пользователя в клиентских соединениях. Задаются уникальные поля.

По умолчанию.

```js
this.userSearchFields = ['username', 'email', 'phone'];
```

Для передачи информации о пользоыателе в сообщение. Можно определить список полей.

По умолчанию.

```js
this.userIncludeFields = ['email', 'phone', 'username', 'uid'];
```

Для того что бы не передавать в сообщениях конфедициальную информацию. Можно определить список полей.

По умолчанию.

```js
this.userExcludeFields = ['rights', 'token'];
```

## Аутентификация пользователя

При поступлении сообщения проверяется, сопоставлен пользователь клиентскому соединениею.
Если пользователь не сопоставлен, то клиентскому соединению присваивается пользователь `this.defaultClientUser`.

Далее отрабатывает функция аутентификации `this.auth`, если она определена. После отрабатывает маршрутизация сообщения.

`this.auth = async ({user, data, client, action}) => {};`

`user` - Пользователь клиентского соединения (на серверной стороне) `user` это копия `client.user`

`data` - Это сообщение пришедшее с клиента. 

`data.user` - Пользователь клиентского соединения (на клиентской стороне). Можно например проверять `user.token` и `data.user.token`.

`client` - Клиентское соединение. У которого есть метод `client.sendMes`. Сопоставленный пользователь `client.user`.

`action` - Действия аутентификации `object {stop: false, terminate: false}`. 
`action.stop = true` - остановить маршрутизацию сообщения, клиентское соединение не разрывается.
`action.terminate = true` - разорвать клиентское соединение. 

```js
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
```

## Логирование

По умолчанию все логи выводятся в `console`. Вывод в `console` можно отменить `jrfws.consoleLog = false`.

Можно задать функцию обработки логов `jrfws.onConsoleLog = async ({log}) => {}`.

| log | client/server | description |
| --- | --- | --- |
| WebSocket connection established | client | Соединение с сервером установлено |
| WebSocket error | client | Ошибка соединения с сервером |
| No client | server | Попытка послать сообщение не указав клиентское соединение |
| No data | all | Попытка отправить сообщение не указав `data, route, act` |
| Error broadcast object to: ${to} | all | Неудачаная попытка `broadcast` |
| Error sendMes ${e} | all | Ошибка отправки сообщения |