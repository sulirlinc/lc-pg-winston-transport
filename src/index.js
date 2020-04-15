const TransportStream = require('winston-transport');
const { L } = require("lc-js-common")
const dao = require('lc-pg-dao')
module.exports = class PG extends TransportStream {

  async initPGDAO({ config }) {
    this.dao = (dao({ config }))
    this.client = this.client || await this.dao.client()
    return dao
  }

  constructor(options = { level: 'info' }) {
    super(options);
    const { level, saveByDayNewTable, tableName = 'z_sys_logs', pgConfig, createTableConfig, addFields = [], defaultSaveDB = true } = options
    this.defaultSaveDB = defaultSaveDB
    this.level = level
    this.fields = addFields
    const fields = [ {
      name: 'meta',
      type: 'JSON'
    } ].concat(addFields)

    const doFun = () => this.initPGDAO({ config: pgConfig }).then(dao => {
      this.tableName = `${ tableName }${ saveByDayNewTable ? '_' + L.getCurrentDay({ format: 'yyyy_MM_dd' }) : '' }`;
      return dao.create(createTableConfig || {
        isAutoCreateId: true,
        createUpdateAt: false,
        tableName: this.tableName,
        fields
      })
    })

    doFun().catch(e => { console.error(e) })
    if (saveByDayNewTable) {
      L.timer.putTrigger({ trigger: () => { doFun().catch(e => { console.error(e) }) } })
    }
    this.setMaxListeners(30);
  }

  log(info, callback = () => {}) {
    const { saveDB = this.defaultSaveDB } = info
    setImmediate(() => {
      this.emit('logged', info);
    });
    if (saveDB) {
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
