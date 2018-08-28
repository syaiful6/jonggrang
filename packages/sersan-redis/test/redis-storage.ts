import Redis from 'ioredis';
import * as T from '@jonggrang/task';
import { allStorageTest } from '@jonggrang/sersan';
import * as RS from '../src';


function connect(uri: string): T.Task<Redis.Redis> {
  return T.makeTask_(cb => {
    const redis = new Redis(uri);
    redis.on('ready', () => {
      cb(null, redis);
    });
  });
}

function quit(redis: Redis.Redis): T.Task<void> {
  return T.makeTask_(cb => {
    redis.quit(function (err, ok) {
      if (err) return cb(err);
      if (ok === 'OK') cb(null);
      cb(new Error('quit return ' + ok));
    });
  });
}

describe('Redis storage', function () {
  const redis = new RS.RedisStorage({} as any, {
    idleTimeout: 600,
    absoluteTimeout: 3600,
    prefix: 'sersan-test',
  });

  before(async function() {
    const connection = await connect('//localhost:6379');
    (redis as any).redis = connection;
  });

  after(async function () {
    await quit(redis.redis);
  });

  allStorageTest(redis, it);
});
