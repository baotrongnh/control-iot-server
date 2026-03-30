require("dotenv").config()

const express = require("express")
const {
     triggerLight,
     triggerAlarm,
     triggerDoor,
     triggerCurtain,
     sentDoorPassword,
} = require("./mqttService")

const app = express()
app.use(express.json())

const DEFAULT_TEST_HOLD_MS = 2000
let isTestRunning = false

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const handleError = (res, err) => {
     const status = err?.code === "MQTT_NOT_CONNECTED" ? 503 : 500
     return res.status(status).json({
          success: false,
          message: err?.message
     })
}

app.get("/online", (req, res) => {
     res.json({ success: true })
})

//action: on / off
app.post("/iot/devices/:espId/light/:id", (req, res) => {
     try {
          const { espId, id } = req.params
          const { action } = req.body

          const details = triggerLight(espId, action, id)
          return res.json({
               success: true,
               message: `The lights have been turned ${action}`,
               details
          })
     } catch (err) {
          return handleError(res, err)
     }
})

//action: on / off
app.post("/iot/devices/:espId/alarm/:id", (req, res) => {
     try {
          const { espId, id } = req.params
          const { action } = req.body

          if (action !== "on" && action !== "off") {
               return res.status(400).json({
                    success: false,
                    message: "action must be 'on' or 'off'",
               })
          }

          const details = triggerAlarm(espId, action, id)
          return res.json({
               success: true,
               message: `Alarm has been turned ${action}`,
               details
          })
     } catch (err) {
          return handleError(res, err)
     }
})

//action: open / close
app.post("/iot/devices/:espId/door/:id", (req, res) => {
     try {
          const { espId, id } = req.params
          const { action } = req.body

          if (action !== "open" && action !== "close") {
               return res.status(400).json({
                    success: false,
                    message: "action must be 'open' or 'close'",
               })
          }

          const details = triggerDoor(espId, action, id)
          return res.json({
               success: true,
               message: `Door has been ${action}ed`,
               details
          })
     } catch (err) {
          return handleError(res, err)
     }
})

//SEND DOOR PASSWORD TO DEVICE
app.post("/iot/devices/:espId/config-door-password/:id", (req, res) => {
     try {
          const { espId, id } = req.params
          const { password } = req.body
          const details = sentDoorPassword(espId, id, password)
          return res.json({
               success: true,
               message: `Password sent successfully.`,
               details
          })
     } catch (err) {
          return handleError(res, err)
     }
})

app.post("/iot/devices/:espId/curtain/:id", (req, res) => {
     try {
          const { espId, id } = req.params
          const { action } = req.body

          if (action !== "open" && action !== "close") {
               return res.status(400).json({
                    success: false,
                    message: "action must be 'open' or 'close'",
               })
          }

          const details = triggerCurtain(espId, action, id)
          return res.json({
               success: true,
               message: `Curtain has been ${action}ed`,
               details
          })
     } catch (err) {
          return handleError(res, err)
     }
})

// Run a full device test sequence. Each step waits 5s by default.
app.post("/iot/devices/:espId/test-sequence", async (req, res) => {
     if (isTestRunning) {
          return res.status(409).json({
               success: false,
               message: "A test sequence is already running",
          })
     }

     const { espId } = req.params
     const holdMs = Number(req.body?.holdMs) > 0 ? Number(req.body.holdMs) : DEFAULT_TEST_HOLD_MS

     const sequence = [
          { name: "LIGHT_1_ON", run: () => triggerLight(espId, "on", 1) },
          { name: "LIGHT_1_OFF", run: () => triggerLight(espId, "off", 1) },
          { name: "LIGHT_2_ON", run: () => triggerLight(espId, "on", 2) },
          { name: "LIGHT_2_OFF", run: () => triggerLight(espId, "off", 2) },
          { name: "ALARM_1_ON", run: () => triggerAlarm(espId, "on", 1) },
          { name: "ALARM_1_OFF", run: () => triggerAlarm(espId, "off", 1) },
          { name: "CURTAIN_1_OPEN", run: () => triggerCurtain(espId, "open", 1) },
          { name: "CURTAIN_1_CLOSE", run: () => triggerCurtain(espId, "close", 1) },
          { name: "DOOR_1_OPEN", run: () => triggerDoor(espId, "open", 1) },
          { name: "DOOR_1_CLOSE", run: () => triggerDoor(espId, "close", 1) },
     ]

     const steps = []
     isTestRunning = true

     try {
          for (let i = 0; i < sequence.length; i++) {
               const action = sequence[i]
               const details = action.run()

               steps.push({
                    order: i + 1,
                    action: action.name,
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
          const status = err?.code === "MQTT_NOT_CONNECTED" ? 503 : 500
          return res.status(status).json({
               success: false,
               message: err?.message || "Failed during test sequence",
               completedSteps: steps,
          })
     } finally {
          isTestRunning = false
     }
})

const port = process.env.PORT || 3000

app.listen(port, () => {
     console.log(`API listening on http://localhost:${port}`)
})
