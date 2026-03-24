# mqtt-test-be

Backend nhỏ để test điều khiển thiết bị IoT qua MQTT.
Project này đang dùng Express để mở API, sau đó publish lệnh xuống ESP theo topic tương ứng.

## Mục tiêu project

Project này phù hợp khi bạn cần:

- test nhanh luồng điều khiển đèn, còi, cửa, rèm;
- kiểm tra broker MQTT có nhận lệnh đúng không;
- làm mẫu để tách mqtt service sang project backend chính.

## Công nghệ đang dùng

- Node.js (CommonJS)
- Express
- MQTT.js
- dotenv
- nodemon

## Cấu trúc thư mục

```txt
mqtt-test-be/
  src/
    server.js
    mqttService.js
    topic.js
  .env
  package.json
```

Ý nghĩa nhanh:

- src/server.js: định nghĩa các API HTTP.
- src/mqttService.js: quản lý kết nối MQTT và hàm publish.
- src/topic.js: gom toàn bộ tên topic.

## Cài đặt và chạy

1. Cài thư viện:

```bash
npm install
```

2. Tạo file .env (hoặc sửa file có sẵn):

```env
MQTT_BROKER_URL=mqtt://broker.hivemq.com:1883
PORT=3000
```

PORT là tùy chọn, không có thì mặc định 3000.

3. Chạy server:

```bash
npm start
```

Server sẽ lắng nghe tại http://localhost:3000

## API hiện tại

### Kiểm tra online

GET /online

Trả về:

```json
{
  "success": true
}
```

### Điều khiển đèn

POST /iot/devices/:espId/light/:id

Body:

```json
{
  "action": "on"
}
```

action hỗ trợ on hoặc off.

Ví dụ:

```bash
curl -X POST http://localhost:3000/iot/devices/ESP_A101/light/1 \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"on\"}"
```

### Điều khiển còi

POST /iot/devices/:espId/alarm/:id

Body:

```json
{
  "action": "on"
}
```

action hỗ trợ on hoặc off.

### Điều khiển cửa

POST /iot/devices/:espId/door/:id

Body:

```json
{
  "action": "open"
}
```

action hỗ trợ open hoặc close.

### Điều khiển rèm

POST /iot/devices/:espId/curtain/:id

Body:

```json
{
  "action": "open"
}
```

action hỗ trợ open hoặc close.

### Gửi mật khẩu cửa

POST /iot/devices/:espId/get-door-password/:id

Body:

```json
{
  "password": "290304"
}
```

### Chạy test sequence

POST /iot/devices/:espId/test-sequence

Body (tùy chọn):

```json
{
  "holdMs": 2000
}
```

API này sẽ chạy lần lượt các bước bật/tắt thiết bị để test nhanh toàn bộ luồng.
Nếu không truyền holdMs thì mặc định là 2000ms giữa mỗi bước.

## Cách publish MQTT trong project này

Topic gửi xuống thiết bị có format:

espId/topic

Ví dụ:

- ESP_A101/light
- ESP_A101/alarm
- ESP_A101/door
- ESP_A101/curtain
- ESP_A101/get/door-password

Payload đang dùng:

- đèn, còi: ON_id hoặc OFF_id
- cửa, rèm: OPEN_id hoặc CLOSE_id
- gửi mật khẩu cửa: gửi thẳng chuỗi password

Ngoài ra server subscribe topic trạng thái:

INTELL/+/status

Khi nhận message, xử lý ở hàm client.on("message") trong src/mqttService.js.

## Cách tách vào backend chính

Nếu bạn muốn nhúng vào backend khác, thường chỉ cần:

1. Copy src/mqttService.js và src/topic.js.
2. Thêm biến MQTT_BROKER_URL vào môi trường.
3. Gọi các hàm trigger trong controller/service của hệ thống chính.

Ví dụ gọi nhanh:

```js
const {
  triggerLight,
  triggerAlarm,
  triggerDoor,
  triggerCurtain,
} = require("./mqttService");

triggerLight("ESP_A101", "on", 1);
triggerAlarm("ESP_A101", "off", 1);
triggerDoor("ESP_A101", "open", 1);
triggerCurtain("ESP_A101", "close", 1);
```

## Lưu ý lỗi thường gặp

- MQTT chưa kết nối:
  Các hàm trigger sẽ throw error với code MQTT_NOT_CONNECTED.
  API sẽ trả 503.

- Gửi action sai:
  alarm chỉ nhận on/off.
  door và curtain chỉ nhận open/close.
  Truyền sai sẽ trả 400.

- Đang chạy test-sequence mà gọi lại:
  API sẽ trả 409 để tránh chồng lệnh.

## Script npm

- npm start: chạy bằng nodemon với src/server.js.
- npm run dev: watch src/server.js bằng nodemon.
