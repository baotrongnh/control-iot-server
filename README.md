# mqtt-test-be

Node.js backend đơn giản (Express) có endpoint `GET /test` để publish MQTT `ON` rồi sau 5 giây publish `OFF`.

## Cài đặt

```bash
npm install
```

## Chạy

```bash
npm start
```

Server mặc định chạy ở `http://localhost:3000`.

## Gọi API

- Healthcheck: `GET /health`
- Test MQTT: `GET /test`

## Cấu hình (tuỳ chọn)

- `PORT` (mặc định `3000`)
- `MQTT_BROKER_URL` (mặc định `mqtt://broker.hivemq.com:1883`)
- `MQTT_TOPIC` (mặc định `iot/ESP_A101/light`)
