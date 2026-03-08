const express = require("express");
const { triggerLight, triggerAlarm, triggerDoor } = require("./mqttService");

const app = express();
app.use(express.json());

const handleError = (res, err) => {
     const status = err?.code === "MQTT_NOT_CONNECTED" ? 503 : 500;
     return res.status(status).json({ ok: false, message: err?.message || "Unknown error" });
};

app.get("/health", (req, res) => {
     res.json({ ok: true });
});

app.get("/light/:espId/:action/:id", (req, res) => {
     try {
          const { espId, action, id } = req.params
          const details = triggerLight(espId, action, id)
          return res.json({
               success: true,
               message: `The lights have been turned ${action}`,
               details
          })
     } catch (err) { return handleError(res, err); }
});

app.get("/alarm/:espId/:action/:id", (req, res) => {
     try {
          const { espId, action, id } = req.params
          const details = triggerAlarm(espId, action, id);
          return res.json({ success: true, message: `Alarm has been turned ${action}`, details });
     } catch (err) { return handleError(res, err); }
});

app.get("/door/:espId/:action/:id", (req, res) => {
     try {
          const { espId, action, id } = req.params
          const details = triggerDoor(espId, action, id);
          return res.json({ success: true, message: `Door has been ${action}ed`, details });
     } catch (err) { return handleError(res, err); }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
     console.log(`API listening on http://localhost:${port}`);
});
