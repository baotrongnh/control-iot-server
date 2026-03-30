const mqtt = require("mqtt")
const { TOPIC_LIGHT, TOPIC_ALARM, TOPIC_DOOR, TOPIC_STATUS, TOPIC_CURTAIN, TOPIC_GET_DOOR_PASSWORD } = require("./topic")

const brokerUrl = process.env.MQTT_BROKER_URL

// Keep one shared client for the whole process
const client = mqtt.connect(brokerUrl, {
     reconnectPeriod: 2000,
     connectTimeout: 10_000,
})

client.on("connect", () => {
     console.log("Connected to MQTT", { brokerUrl })

     client.subscribe(TOPIC_STATUS, (err) => {
          if (!err) {
               console.log("Subscribed to status topic")
          }
     })
})

client.on("reconnect", () => {
     console.log("Reconnecting MQTT...")
})

client.on("error", (err) => {
     console.error("MQTT error:", err?.message || err)
})

client.on("message", (topic, message) => {
     const msg = message.toString()
     const parts = topic.split('/')
     const deviceId = parts[1]  // HOMEIQ/<deviceId>/status
     console.log(`[${deviceId}]: ${msg}`)

     if (msg === 'GET_DOOR_PASSWORD') {
          sentDoorPassword(deviceId, 1, '290304')
     }

     if (msg === 'FIRE') {
          console.log('CHÁY NÈ CHẠY ĐI');
     }

     if (msg === 'FIRE_ACK') {
          console.log('HẾT CHÁY RỒI');
     }

     if (msg === 'ONLINE') {
          console.log('ONLINE');
     }
})

function triggerLight(espId, action, lightId) {
     const topic = `${espId}/${TOPIC_LIGHT}`
     if (!client.connected) {
          const error = new Error("MQTT client is not connected yet")
          error.code = "MQTT_NOT_CONNECTED"
          throw error
     } else {
          client.publish(topic, `${action}_${lightId}`)
     }
     return {
          brokerUrl,
          topic: TOPIC_LIGHT,
          action,
          lightId
     }
}

function triggerAlarm(espId, action, alarmId) {
     const topic = `${espId}/${TOPIC_ALARM}`
     if (!client.connected) {
          const error = new Error("MQTT client is not connected yet")
          error.code = "MQTT_NOT_CONNECTED"
          throw error
     } else {
          client.publish(topic, `${action}_${alarmId}`)
     }
     return {
          brokerUrl,
          topic,
          action,
          alarmId
     }
}

//ACTION: ON - OFF
function triggerDoor(espId, action, doorId) {
     const topic = `${espId}/${TOPIC_DOOR}`
     if (!client.connected) {
          const error = new Error("MQTT client is not connected yet")
          error.code = "MQTT_NOT_CONNECTED"
          throw error
     } else {
          client.publish(topic, `${action}_${doorId}`)
     }
     return {
          brokerUrl,
          topic,
          action,
          doorId
     }
}

function sentDoorPassword(espId, doorId, password) {
     const topic = `${espId}/${TOPIC_GET_DOOR_PASSWORD}`
     if (!client.connected) {
          const error = new Error("MQTT client is not connected yet")
          error.code = "MQTT_NOT_CONNECTED"
          throw error
     } else {
          client.publish(topic, password)
     }
     return {
          brokerUrl,
          topic,
          password,
          doorId
     }
}

function triggerCurtain(espId, action, curtainID) {
     const topic = `${espId}/${TOPIC_CURTAIN}`
     if (!client.connected) {
          const error = new Error("MQTT client is not connected yet")
          error.code = "MQTT_NOT_CONNECTED"
          throw error
     } else {
          client.publish(topic, `${action}_${curtainID}`)
     }
     return {
          brokerUrl,
          topic,
          action,
          curtainId: curtainID
     }
}

function checkOnline(espId, action, lightId) {
     const topic = `HOMEIQ/${espId}/status`
     if (!client.connected) {
          const error = new Error("MQTT client is not connected yet")
          error.code = "MQTT_NOT_CONNECTED"
          throw error
     } else {
          client.publish(topic, `ARE_YOU_OK`)
     }
     return {
          brokerUrl,
          topic: TOPIC_LIGHT,
          action,
          lightId
     }
}

module.exports = {
     client,
     triggerLight,
     triggerAlarm,
     triggerDoor,
     triggerCurtain,
     sentDoorPassword
};
