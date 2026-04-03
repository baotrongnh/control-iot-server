require("dotenv").config()

const express = require("express")
const {
     sendDoorPassword,
     getMeter,
     controlDevice,
     checkOnline,
} = require("./mqttService")
const {
     TOPIC_LIGHT,
     TOPIC_ALARM,
     TOPIC_DOOR,
     TOPIC_CURTAIN,
} = require("./topic")
const {
     ACTION_ON,
     ACTION_OFF,
     DEFAULT_TEST_HOLD_MS,
     DEFAULT_PORT,
     ERROR_MQTT_NOT_CONNECTED,
     ERROR_INVALID_ACTION,
     ERROR_INVALID_INPUT,
} = require("./constants")

const app = express()
app.use(express.json())

let isTestRunning = false

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const createError = (message, code) => Object.assign(new Error(message), { code })

const handleError = (res, err, extra = {}) => {
     const status = err?.code === ERROR_MQTT_NOT_CONNECTED
          ? 503
          : (err?.code === ERROR_INVALID_ACTION || err?.code === ERROR_INVALID_INPUT ? 400 : 500)

     return res.status(status).json({
          success: false,
          message: err?.message || "Internal server error",
          code: err?.code,
          ...extra,
     })
}

const toPositiveNumber = (value, fallbackValue) => {
     const numeric = Number(value)
     return Number.isFinite(numeric) && numeric > 0 ? numeric : fallbackValue
}

const normalizeActionInput = (action) => String(action || "").trim().toUpperCase()

const validateRequired = (value, fieldName) => {
     if (!String(value || "").trim()) {
          throw createError(`${fieldName} is required`, ERROR_INVALID_INPUT)
     }
}

const validateOnOff = (action) => {
     if (action !== ACTION_ON && action !== ACTION_OFF) {
          throw createError("Invalid action. Only ON/OFF are accepted", ERROR_INVALID_ACTION)
     }
}

const getTelemetry = (req, res) => {
     try {
          const { espId } = req.params
          validateRequired(espId, "espId")

          const details = getMeter(espId)
          return res.json({ success: true, message: "Get meters.", details })
     } catch (err) {
          return handleError(res, err)
     }
}

app.get("/online", (req, res) => {
     res.json({ success: true })
})

//SEND DOOR PASSWORD TO DEVICE
app.post("/iot/devices/:espId/config-door-password/:id", (req, res) => {
     try {
          const { espId, id } = req.params
          const { password } = req.body

          validateRequired(espId, "espId")
          validateRequired(id, "id")
          validateRequired(password, "password")

          const details = sendDoorPassword(espId, id, password)
          return res.json({
               success: true,
               message: `Password sent successfully.`,
               details
          })
     } catch (err) {
          return handleError(res, err)
     }
})

app.post("/iot/devices/:espId/get-telemetry", (req, res) => {
     return getTelemetry(req, res)
})

app.get("/iot/devices/:espId/check-health", (req, res) => {
     try {
          const { espId } = req.params

          validateRequired(espId, "espId")

          const details = checkOnline(espId)
          return res.json({
               success: true,
               message: "Health check signal sent",
               details
          })
     } catch (err) {
          return handleError(res, err)
     }
})

// Run a full device test sequence.
app.post("/iot/devices/:espId/test-sequence", async (req, res) => {
     if (isTestRunning) {
          return res.status(409).json({
               success: false,
               message: "A test sequence is already running",
          })
     }

     const { espId } = req.params
     const holdMs = toPositiveNumber(req.body?.holdMs, DEFAULT_TEST_HOLD_MS)

     const sequence = [
          [TOPIC_LIGHT, 1, ACTION_ON],
          [TOPIC_LIGHT, 1, ACTION_OFF],
          [TOPIC_LIGHT, 2, ACTION_ON],
          [TOPIC_LIGHT, 2, ACTION_OFF],
          [TOPIC_ALARM, 1, ACTION_ON],
          [TOPIC_ALARM, 1, ACTION_OFF],
          [TOPIC_CURTAIN, 1, ACTION_ON],
          [TOPIC_CURTAIN, 1, ACTION_OFF],
          [TOPIC_DOOR, 1, ACTION_ON],
          [TOPIC_DOOR, 1, ACTION_OFF],
     ]

     const steps = []
     isTestRunning = true

     try {
          for (let i = 0; i < sequence.length; i++) {
               const [topic, deviceId, action] = sequence[i]
               const details = controlDevice(espId, action, deviceId, topic)

               steps.push({
                    order: i + 1,
                    action: `${topic}_${deviceId}_${action}`,
                    details,
               })

               if (i < sequence.length - 1) {
                    await sleep(holdMs)
               }
          }

          return res.json({
               success: true,
               message: "Test sequence completed",
               holdMs,
               totalSteps: steps.length,
               steps,
          })
     } catch (err) {
          return handleError(res, err, { completedSteps: steps })
     } finally {
          isTestRunning = false
     }
})

app.post("/iot/devices/:espId/:deviceId", (req, res) => {
     try {
          const { espId, deviceId } = req.params
          const normalizedAction = normalizeActionInput(req.body?.action)
          const topic = req.body?.topic

          validateRequired(espId, "espId")
          validateRequired(deviceId, "deviceId")
          validateRequired(topic, "topic")
          validateOnOff(normalizedAction)

          const details = controlDevice(espId, normalizedAction, deviceId, topic)

          return res.json({
               success: true,
               message: `${topic} ${deviceId} has been ${normalizedAction}`,
               details
          })
     } catch (err) {
          return handleError(res, err)
     }
})

const port = process.env.PORT || DEFAULT_PORT

app.listen(port, () => {
     console.log(`API listening on http://localhost:${port}`)
})
