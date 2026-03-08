# mqtt-test-be

> **Mục đích:** Đây là server mẫu dùng để **hướng dẫn team BE** cách tích hợp MQTT vào hệ thống backend chính để điều khiển thiết bị IoT (đèn, còi báo động, cửa) thông qua ESP32/ESP8266.

---

## Cấu trúc project

```
mqtt-test-be/
├── src/
│   ├── server.js        # Express server, định nghĩa các REST API
│   ├── mqttService.js   # Logic kết nối MQTT, publish lệnh điều khiển
│   └── topic.js         # Tập trung tất cả MQTT topic name
├── .env                 # Biến môi trường (broker URL, port)
├── package.json
└── README.md
```

---

## Cài đặt

### Yêu cầu

- Node.js >= 18
- npm >= 9

### Bước 1 — Cài thư viện

```bash
npm install
```

Các thư viện được cài:
| Package | Mục đích |
|---------|----------|
| `express` | HTTP server |
| `mqtt` | Kết nối MQTT broker |
| `dotenv` | Đọc biến môi trường từ file `.env` |
| `nodemon` | Tự restart server khi code thay đổi (dev) |

### Bước 2 — Cấu hình `.env`

Tạo hoặc chỉnh sửa file `.env` ở thư mục gốc:

```env
MQTT_BROKER_URL=mqtt://broker.hivemq.com:1883
PORT=3000
```

> **Lưu ý:** Khi tích hợp vào hệ thống chính, thay `MQTT_BROKER_URL` thành địa chỉ broker thực tế của dự án.

### Bước 3 — Chạy server

```bash
npm start
```

Server chạy tại `http://localhost:3000`.

---

## Hướng dẫn tích hợp vào hệ thống chính

### 1. Copy file cần thiết

Chỉ cần copy 2 file vào project chính:

```
src/mqttService.js   ← module xử lý MQTT (connect, publish, subscribe)
src/topic.js         ← định nghĩa tên các topic
```

### 2. Đảm bảo `.env` có biến `MQTT_BROKER_URL`

```env
MQTT_BROKER_URL=mqtt://<địa_chỉ_broker>:<port>
```

### 3. Import và dùng trong route/controller

```js
const { triggerLight, triggerAlarm, triggerDoor } = require("./mqttService");

// Bật đèn số 1 của thiết bị ESP_A101
triggerLight("ESP_A101", "on", "1");

// Tắt đèn số 1
triggerLight("ESP_A101", "off", "1");

// Bật còi báo động số 1
triggerAlarm("ESP_A101", "on", "1");

// Mở cửa số 1
triggerDoor("ESP_A101", "open", "1");
```

> `mqttService.js` tạo **một MQTT client duy nhất dùng chung** cho toàn bộ server (singleton). Không cần khởi tạo lại mỗi lần gọi.

### 4. Xử lý lỗi khi MQTT chưa kết nối

Các hàm `triggerLight`, `triggerAlarm`, `triggerDoor` sẽ **throw error** với `error.code = "MQTT_NOT_CONNECTED"` nếu broker chưa kết nối. Nên bắt lỗi này:

```js
try {
  triggerLight(espId, "on", lightId);
} catch (err) {
  if (err.code === "MQTT_NOT_CONNECTED") {
    return res
      .status(503)
      .json({ message: "Thiết bị chưa kết nối, thử lại sau" });
  }
  return res.status(500).json({ message: err.message });
}
```

---

## Cấu trúc MQTT Topic

Được định nghĩa trong `src/topic.js`:

| Hằng số        | Topic             | Chiều                    |
| -------------- | ----------------- | ------------------------ |
| `TOPIC_LIGHT`  | `light`           | Publish (server → ESP)   |
| `TOPIC_ALARM`  | `alarm`           | Publish (server → ESP)   |
| `TOPIC_DOOR`   | `door`            | Publish (server → ESP)   |
| `TOPIC_STATUS` | `INTELL/+/status` | Subscribe (ESP → server) |

Topic đầy đủ khi publish: `<espId>/<topic>`, ví dụ: `ESP_A101/light`

---

## REST API hiện tại

### `GET /health`

Kiểm tra server còn sống không.

**Response:**

```json
{ "ok": true }
```

---

### `GET /light/:espId/:action/:id`

Điều khiển đèn.

| Param    | Mô tả               | Giá trị hợp lệ |
| -------- | ------------------- | -------------- |
| `espId`  | ID của thiết bị ESP | VD: `ESP_A101` |
| `action` | Hành động           | `on` / `off`   |
| `id`     | ID của đèn          | VD: `1`, `2`   |

**Ví dụ:** `GET /light/ESP_A101/on/1`

**Response:**

```json
{
  "success": true,
  "message": "The lights have been turned on",
  "details": {
    "brokerUrl": "...",
    "topic": "light",
    "action": "on",
    "lightId": "1"
  }
}
```

---

### `GET /alarm/:espId/:action/:id`

Điều khiển còi báo động.

| Param    | Giá trị hợp lệ |
| -------- | -------------- |
| `action` | `on` / `off`   |

**Ví dụ:** `GET /alarm/ESP_A101/on/1`

---

### `GET /door/:espId/:action/:id`

Điều khiển cửa.

| Param    | Giá trị hợp lệ   |
| -------- | ---------------- |
| `action` | `open` / `close` |

**Ví dụ:** `GET /door/ESP_A101/open/1`

---

## Payload gửi xuống ESP

| Thiết bị | Payload                  |
| -------- | ------------------------ |
| Đèn bật  | `ON_<id>` → VD: `ON_1`   |
| Đèn tắt  | `OFF_<id>` → VD: `OFF_1` |
| Còi bật  | `ON_<id>`                |
| Còi tắt  | `OFF_<id>`               |
| Cửa mở   | `OPEN_<id>`              |
| Cửa đóng | `CLOSE_<id>`             |

---

## Lắng nghe trạng thái từ ESP

Server tự động **subscribe** topic `INTELL/+/status` khi khởi động. Mỗi khi ESP gửi trạng thái lên, server sẽ log:

```
[ESP_A101] online
[ESP_A101] offline
```

Để xử lý logic riêng (lưu DB, emit socket...), chỉnh hàm `client.on("message", ...)` trong `mqttService.js`.
