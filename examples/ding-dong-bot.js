/**
 * Wechaty - WeChat Bot SDK for Personal Account, Powered by TypeScript, Docker, and 💖
 *  - https://github.com/chatie/wechaty
 */
const {
  Wechaty,
  ScanStatus,
  log,
} = require('wechaty')

const http = require('http')

const qs = require('querystring')

const schedule = require('node-schedule')

const url = 'http://localhost:8083'
/**
 * You can ignore the next line becasue it is using for CodeSandbox
 */
require('./.util/helper')

function onScan (qrcode, status) {
  if (status === ScanStatus.Waiting || status === ScanStatus.Timeout) {
    require('qrcode-terminal').generate(qrcode, { small: true })  // show qrcode on console

    const qrcodeImageUrl = [
      'https://api.qrserver.com/v1/create-qr-code/?data=',
      encodeURIComponent(qrcode),
    ].join('')

    log.info('StarterBot', 'onScan: %s(%s) - %s', ScanStatus[status], status, qrcodeImageUrl)

  } else {
    log.info('StarterBot', 'onScan: %s(%s)', ScanStatus[status], status)
  }
}

function onLogin (user) {
  global.mySelf = user
  log.info('StarterBot', '%s login', user)
}

function onReady () {
  log.info('数据准备完毕')
  const scheduleCronstyle = () => {
    // 每天晚上9点执行一次:  0 0 21 * * *
    schedule.scheduleJob('0 0 21 * * *', () => {
      sendStudyMsg()
      console.log('scheduleCronstyle:定时任务执行' + new Date())
    })
  }
  scheduleCronstyle()
}

async function sendStudyMsg () {
  const roomList = await bot.Room.findAll()
  let accountStr = ''
  roomList.forEach(room1 => {
    let topic = room1.payload.topic
    console.log(topic)
    if (topic.indexOf(' ') !== -1) {
      accountStr += topic.split(' ')[1] + ','
    }
  })
  console.log(accountStr)
  http.get(`${url}/quartz/robot/getDailyState?account=${accountStr}`, function (data) {
    var result = ''
    data.on('data', function (chunk) {
      result += chunk//监听数据响应，拼接数据片段
    })
    data.on('end', function () {
      let msgMap = new Map()
      let msg1Map = new Map()
      let res = JSON.parse(result)
      if (res.status === 200) {
        let dataList = res.data
        dataList.forEach(dataItem => {
          msgMap.set(dataItem.account, dataItem.msg)
          msg1Map.set(dataItem.account, dataItem.msg1)
        })
        roomList.forEach(room1 => {
          let topic = room1.payload.topic
          console.log(topic)
          if (topic.indexOf(' ') !== -1) {
            let account = topic.split(' ')[1]
            let msg = msgMap.get(account)
            room1.say(msg)

            if (msg1Map.get(account)) {
              room1.say(msg1Map.get(account))
            }
          }
        })
      }
    })
  })
}

function onLogout (user) {
  log.info('StarterBot', '%s logout', user)
}

async function onMessage (msg) {
  const contact = msg.from()
  const text = msg.text()
  const room = msg.room()

  const mySelf = global.mySelf

  if (room) {
    if (!(await msg.mentionSelf())) {
      // 没有人@机器人不返回消息
      console.log('机器人没有被@')
      return
    }
    console.log('机器人被@')

    // 通过@后的空格拆分字符串
    let split = text.split('\u2005')

    // 消息内容
    content = split[split.length - 1]

    // 有人@机器人 "^['A-Za-z ]+$"
    if (/^['A-Za-z ]+$/.test(content)) {
      console.log('发送语音链接消息')
      // 如果内容中有英文，提供语音
      await room.say(`${url}/dictvoice?type=2&audio=${content}`)
    } else {
      // 将文本翻译成英语
      console.log('发送中文翻译信息')
      http.get(`${url}/translate/zhToEn?text=${content}`, function (data) {
        var result = ''
        data.on('data', function (chunk) {
          result += chunk//监听数据响应，拼接数据片段
        })
        data.on('end', function () {
          let res = JSON.parse(result)
          if (res.status === 200) {
            room.say(res.data.word)
          }
        })
      })
    }
  }
}

const bot = new Wechaty({
  name: 'ding-dong-bot',
  /**
   * Specify a puppet for a specific protocol (Web/Pad/Mac/Windows, etc).
   *
   * You can use the following providers:
   *  - wechaty-puppet-hostie
   *  - wechaty-puppet-puppeteer
   *  - wechaty-puppet-padplus
   *  - wechaty-puppet-macpro
   *  - etc.
   *
   * Learn more about Wechaty Puppet Providers at:
   *  https://github.com/wechaty/wechaty-puppet/wiki/Directory
   */

  puppet: 'wechaty-puppet-padplus',
})

bot.on('scan', onScan)
bot.on('login', onLogin)
bot.on('ready', onReady)
bot.on('logout', onLogout)
bot.on('message', onMessage)

bot.start()
  .then(() => log.info('StarterBot', 'Starter Bot Started.'))
  .catch(e => log.error('StarterBot', e))
