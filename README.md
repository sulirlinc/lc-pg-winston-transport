# lc-pg-winston-transport
winston 日志写入postgres数据库的插件。

## 使用方法

参数说明：

* `saveByDayNewTable`: 每天会创建新表。并用日期命名。
* `defaultSaveDB`: level = info时，默认情况下，是否写入数据库。
* `addFields`: 在数据库中添加表字段，并且可以指定数据将数据存入。
* `pgConfig`: 数据库配置。
* `tableName`: 自定义日志表名，默认表名为`z_sys_logs`。

* 代码事如下：

```javascript

const winston = require("winston");
const pgTransports = require("lc-pg-winston-transport")

const logger = winston.createLogger({
  transports: [ new pgTransports({
    pgConfig: {
      "user": "postgres",
      "password": "123123",
      "host": "127.0.0.1",
      "port": "5432",
      "database": "test"
    },
    addFields: [ {
      name: 'user',
      type: 'varchar(255)'
    }
    ], defaultSaveDB: false, saveByDayNewTable: true
  }) ]
});
logger.info({ message: "abcdefg", user: "admin", saveDB: true })
logger.info("直接输出日志") // 如果defaultSaveDB=true,日志将自动写入到数据库中。
```
