require("dotenv").config()

const express = require("express")
const { triggerLight, triggerAlarm, triggerDoor } = require("./mqttService")

const app = express()
app.use(express.json())

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
app.get("/iot/devices/:espId/alarm/:id", (req, res) => {
     try {
          const { espId, id } = req.params
          const { action } = req.body
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
app.get("/iot/devices/:espId/door/:id", (req, res) => {
     try {
          const { espId, id } = req.params
          const { action } = req.body
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

const port = process.env.PORT || 3000

app.listen(port, () => {
     console.log(`API listening on http://localhost:${port}`)
})
