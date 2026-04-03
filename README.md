# mqtt-test-be

Backend test và gateway điều khiển thiết bị IoT qua MQTT.

Project đã được chuẩn hóa để dễ tách thành module cho backend khác.
Action hiện tại chỉ dùng ON/OFF.

## Mục tiêu

- Test nhanh luồng điều khiển đèn, báo động, cửa, rèm
- Gửi lệnh theo format thống nhất ON/OFF
- Tách thành module MQTT để nhúng vào project lớn

## Stack

- Node.js CommonJS
- Express
- MQTT.js
- dotenv
- nodemon

## Cấu trúc thư mục

```txt
mqtt-test-be/
  src/
    constants.js
    topic.js
    mqttService.js
    server.js
  .env
  package.json
```

## Vai trò từng file

- src/constants.js: gom các chuỗi dễ thay đổi về sau
- src/topic.js: tên topic MQTT
- src/mqttService.js: kết nối MQTT và các hàm publish
- src/server.js: API HTTP và test sequence

## Cài đặt

```bash
npm install
```

Tạo .env:

```env
MQTT_BROKER_URL=mqtt://broker.hivemq.com:1883
PORT=3000
DEFAULT_DOOR_PASSWORD=290304
```

Chạy:

```bash
npm start
```

## MQTT chuẩn mới

### Topic publish xuống ESP

Format chung:

- espId/topic

Topic điều khiển:

- espId/light
- espId/alarm
- espId/door
- espId/curtain

Topic nghiệp vụ:

- espId/get/door-password
- espId/get/telemetry

### Payload

Điều khiển thiết bị:

- ON_id
- OFF_id

Yêu cầu telemetry:

- GET_TELEMETRY

### Topic subscribe từ backend

- HOMEIQ/+/status
- HOMEIQ/+/telemetry

Khi nhận message ở topic telemetry, service sẽ log:

- espId
- message

Format log hiện tại:

- `[METER] espId=<espId>, message=<message>`

## API hiện tại

### 1) Health

- GET /online

### 2) Gửi mật khẩu cửa

- POST /iot/devices/:espId/config-door-password/:id
- body:

```json
{
  "password": "290304"
}
```

### 3) Lấy meter

- POST /iot/devices/:espId/get-telemetry

### 4) Điều khiển một thiết bị

- POST /iot/devices/:espId/:deviceId
- body:

```json
{
  "topic": "light",
  "action": "ON"
}
```

Ghi chú:

- action được normalize uppercase
- chỉ chấp nhận ON/OFF

### 5) Kiểm tra health signal

- GET /iot/devices/:espId/check-health

### 6) Test sequence

- POST /iot/devices/:espId/test-sequence
- body optional:

```json
{
  "holdMs": 2000
}
```

## Cách tách thành module cho project khác

Bước 1: copy 3 file

- src/constants.js
- src/topic.js
- src/mqttService.js

Bước 2: trong project mới, tạo service wrapper

```js
const {
  controlDevice,
  getTelemetry,
  sendDoorPassword,
  checkOnline,
} = require("./mqttService");

module.exports = {
  controlDevice,
  getTelemetry,
  sendDoorPassword,
  checkOnline,
};
```

Bước 3: gọi trong controller/use-case của backend chính

```js
await controlDevice("ESP_A101", "ON", 1, "light");
await getTelemetry("ESP_A101");
```

## Gợi ý cấu trúc DB lưu ESP và mạch liên quan

Bạn có thể bắt đầu từ model document đơn giản:

```json
{
  "id": "ESP_A101",
  "name": "Gateway A101",
  "apartmentId": "APT_01_01",
  "status": "ONLINE",
  "lastSeenAt": "2026-04-03T08:00:00.000Z",
  "devices": [
    {
      "id": "LIGHT_01",
      "type": "LIGHT",
      "topic": "light",
      "channel": 1,
      "state": "OFF"
    },
    {
      "id": "DOOR_01",
      "type": "DOOR",
      "topic": "door",
      "channel": 1,
      "state": "OFF"
    }
  ],
  "telemetry": {
    "water_total": 12.5,
    "energy_total": 3.2,
    "updatedAt": "2026-04-03T08:00:00.000Z"
  }
}
```

Nếu dùng SQL, nên tách bảng:

- esp_gateways: id, name, apartment_id, status, last_seen_at
- esp_devices: id, esp_id, type, topic, channel, state, updated_at
- esp_telemetry: id, esp_id, water_total, energy_total, created_at
- esp_events: id, esp_id, device_id, action, topic, payload, created_at

## Lưu ý quan trọng

- Không hardcode password trong code, dùng biến môi trường hoặc DB
- Route generic POST /iot/devices/:espId/:deviceId phải đặt sau route đặc thù như test-sequence để tránh bắt nhầm
- MQTT có thể reconnect, nên các hàm service throw error code MQTT_NOT_CONNECTED để API trả 503
- Validate input ở API layer và service layer để tránh publish payload sai
- Luôn chuẩn hóa action ON/OFF trước khi publish
- Khi đổi topic telemetry/status trong src/topic.js, cần đồng bộ cả ESP firmware và backend parser
