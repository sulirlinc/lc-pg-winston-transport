const TransportStream = require('winston-transport');
const { L } = require("lc-js-common")
const dao = require('lc-pg-dao')

const doCreateTable = (tableName, dao, createTableConfig, fields) => {
  return dao.create(createTableConfig || {
    isAutoCreateId: true,
    createUpdateAt: false,
    tableName,
    fields
  })
}

module.exports = class PG extends TransportStream {

  async initPGDAO({ config }) {
    this.dao = dao({ config })
    this.client = this.client || await this.dao.client()
    return this.dao
  }

  constructor(options = { level: 'info' }) {
    super(options);
    const { level, saveByDayNewTable, tableName = 'z_sys_logs', pgConfig, createTableConfig, addFields = [], defaultSaveDB = true } = options
    this.tableName = `${ tableName }${ saveByDayNewTable ? '_' + L.getCurrentDay({ format: 'yyyy_MM_dd' }) : '' }`;
    this.defaultSaveDB = defaultSaveDB
    this.level = level
    this.fields = addFields
    const fields = [ {
      name: 'meta',
      type: 'JSON'
    } ].concat(addFields)
    const me = this
    this.initPGDAO({ config: pgConfig }).then(dao => {
      return doCreateTable.call(me, tableName, saveByDayNewTable, dao, createTableConfig, fields);
    }).catch(e => { console.error(e) })
    if (saveByDayNewTable) {
      setTimeout(() => L.timer.putTrigger({ trigger: () => { doCreateTable.call(me, tableName, saveByDayNewTable, dao, createTableConfig, fields).catch(e => { console.error(e) }) } }), 10000);
    }
    this.setMaxListeners(30);
  }

  log(info, callback = () => {}) {
    const { saveDB = this.defaultSaveDB } = info
    setImmediate(() => {
      this.emit('logged', info);
    });
    if (saveDB) {
      delete info['saveDB']
      this.saveDB({ info, saveDB }).catch(e => console.error(e));
    }
    callback();
  }

  async saveDB({ info }) {
    const data = { meta: info, createAt: L.now() };
    this.fields.map(value => {
      if (info[value.name]) {
        data[value.name] = info[value.name]
        delete info[value.name]
      }
    })
    const saveData = { tableName: this.tableName, unCheck: true, data };
    if (!this.dao) {
      setTimeout(() => this.dao.insertData(saveData), 2000)
    } else {
      await this.dao.insertData(saveData)
    }
  }
}
