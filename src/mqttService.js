const mqtt = require("mqtt")
const { TOPIC_STATUS, TOPIC_GET_DOOR_PASSWORD, TOPIC_GET_METER, TOPIC_METER_STATUS } = require("./topic")
const {
     ACTION_ON,
     ACTION_OFF,
     MQTT_MESSAGE_GET_TELEMETRY,
     MQTT_MESSAGE_GET_DOOR_PASSWORD,
     MQTT_MESSAGE_HEALTH_CHECK,
     MQTT_MESSAGE_FIRE,
     MQTT_MESSAGE_FIRE_ACK,
     MQTT_MESSAGE_ONLINE,
     ERROR_MQTT_NOT_CONNECTED,
     ERROR_INVALID_ACTION,
     ERROR_INVALID_INPUT,
     MQTT_RECONNECT_PERIOD_MS,
     MQTT_CONNECT_TIMEOUT_MS,
} = require("./constants")

const brokerUrl = process.env.MQTT_BROKER_URL
const fallbackDoorPassword = process.env.DEFAULT_DOOR_PASSWORD || "290304"

const err = (message, code) => Object.assign(new Error(message), { code })
const must = (value, name) => {
     if (!String(value || "").trim()) throw err(`${name} is required`, ERROR_INVALID_INPUT)
}
const ensureConnected = () => {
     if (!client.connected) throw err("MQTT client is not connected yet", ERROR_MQTT_NOT_CONNECTED)
}
const toOnOff = (action) => {
     const value = String(action || "").trim().toUpperCase()
     if (value !== ACTION_ON && value !== ACTION_OFF) throw err("Invalid action. Only ON/OFF are accepted", ERROR_INVALID_ACTION)
     return value
}
const publish = (topic, payload) => {
     ensureConnected()
     client.publish(topic, String(payload))
     return topic
}

// Keep one shared client for the whole process
const client = mqtt.connect(brokerUrl, {
     reconnectPeriod: MQTT_RECONNECT_PERIOD_MS,
     connectTimeout: MQTT_CONNECT_TIMEOUT_MS,
})

client.on("connect", () => {
     console.log("Connected to MQTT", { brokerUrl })

          ;[TOPIC_STATUS, TOPIC_METER_STATUS].forEach((topic) => {
               client.subscribe(topic, (error) => {
                    if (error) {
                         console.error("Subscribe error:", error?.message || error)
                         return
                    }
                    console.log(`Subscribed: ${topic}`)
               })
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
     const parts = topic.split("/")
     const espId = parts.length > 1 ? parts[1] : "UNKNOWN"

     if (topic.endsWith("/meter")) {
          console.log(`[METER] espId=${espId}, message=${msg}`)
          return
     }

     if (!topic.endsWith("/status")) return

     switch (msg) {
          case MQTT_MESSAGE_GET_DOOR_PASSWORD:
               if (espId !== "UNKNOWN") {
                    sendDoorPassword(espId, 1, fallbackDoorPassword)
               }
               break
          case MQTT_MESSAGE_FIRE:
               console.log(`[${espId}] fire alarm activated`)
               break
          case MQTT_MESSAGE_FIRE_ACK:
               console.log(`[${espId}] fire alarm acknowledged`)
               break
          case MQTT_MESSAGE_ONLINE:
               console.log(`[${espId}] ONLINE`)
               break
          default:
               break
     }
})

function getTelemetry(espId) {
     must(espId, "espId")
     const topic = publish(`${espId}/${TOPIC_GET_METER}`, MQTT_MESSAGE_GET_TELEMETRY)

     return {
          brokerUrl,
          topic
     }
}

function sendDoorPassword(espId, doorId, password) {
     must(espId, "espId")
     must(password, "password")
     const topic = publish(`${espId}/${TOPIC_GET_DOOR_PASSWORD}`, password)

     return {
          brokerUrl,
          topic,
          password,
          doorId
     }
}

function controlDevice(espId, action, deviceID, topic) {
     must(espId, "espId")
     must(topic, "topic")
     must(deviceID, "deviceID")

     const normalizedAction = toOnOff(action)
     const topicCustom = publish(`${espId}/${topic}`, `${normalizedAction}_${deviceID}`)

     return {
          brokerUrl,
          topic: topicCustom,
          action: normalizedAction,
          deviceID: deviceID
     }
}

function checkOnline(espId) {
     must(espId, "espId")
     const topic = publish(`HOMEIQ/${espId}/status`, MQTT_MESSAGE_HEALTH_CHECK)

     return {
          brokerUrl,
          topic
     }
}

module.exports = {
     client,
     checkOnline,
     sendDoorPassword,
     getTelemetry,
     controlDevice
};
