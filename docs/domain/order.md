# Order Server API 명세서

> **Base URL:** `http://localhost:8072/api/v1`

---

## order_state 코드 정의

Order Server API에서 제공하는 order_state 코드 정의입니다.

### order_state 코드 상세

| order_state                    | 설명             | 비고                            |
| :----------------------------- | :--------------- | :------------------------------ |
| `ORDER_CHECKED_OUT`            | 주문체크아웃     | 주문 프로세스 시작              |
| `INVENTORY_RESERVED`           | 재고예약완료     | 결제 전 단계                    |
| `INVENTORY_RESERVATION_FAILED` | 재고예약실패     | 재고 부족 등                    |
| `PAYMENT_COMPLETED`            | 결제완료         | 결제 승인 완료                  |
| `PAYMENT_FAILED`               | 결제실패         | 결제 거절 등                    |
| `INVENTORY_DEDUCTION_FAILED`   | 재고차감실패     | 최종 재고 처리 오류             |
| `INVENTORY_RELEASED`           | 재고예약해제완료 | 주문 취소/실패로 인한 재고 복구 |
| `INVENTORY_RELEASE_FAILED`     | 재고예약해제실패 | 재고 복구 프로세스 오류         |
| `ORDER_COMPLETED`              | 주문완료         | 모든 주문 과정 정상 종료        |
| `ORDER_CANCELLED`              | 주문취소         | 주문 취소 처리 완료             |

---

## `POST /orders`

주문 checkout을 요청합니다.

> ⚠️ **알려진 문제 ([ORDER-02])**: `src/api/orderApi.js` `createOrder`의 URL이 현재 `/orders/get`으로 설정되어 있음. 명세 기준은 `/orders`이며 일치하지 않는다.

### Request Body

✅ : 필수
❌ : 옵션
| Name | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `user_name` | `String` | ❌ | 주문자 이름 |
| `receiver_name` | `String` | ❌ | 수령인 이름 |
| `receiver_phone` | `String` | ❌ | 수령인 연락처 |
| `receiver_addr` | `String` | ❌ | 배송지 주소 (배송 메시지 포함 시 주소 뒤에 공백으로 연결해 전송) |
| `items` | `Array` | ✅ | 주문 상품 목록 |
| `items[].productId` | `Number` | ✅ | 상품 ID |
| `items[].optionId` | `Number` | ✅ | 옵션 ID |
| `items[].quantity` | `Number` | ✅ | 수량 |

> `user_id`는 서버가 인증 컨텍스트(HttpOnly 쿠키)에서 직접 추출하므로 요청 body에 포함하지 않는다.

### 배송 메시지 처리 규칙

백엔드 API에 `delivery_message` 전용 필드가 없으므로, 프론트엔드에서 `receiver_addr` 뒤에 공백으로 연결해 전송한다.

```
receiver_addr = "[우편번호] [기본주소] [추가주소] [나머지주소] [배송메시지]"
```

- 배송 메시지가 없으면 주소만 전송 (빈 문자열은 `filter(Boolean)` 으로 자동 제거).
- 배송 메시지 선택지 및 직접 입력 규칙은 `docs/view/checkout.md` 참고.

### Request Body Example

```json
{
  "user_name": "홍길동",
  "receiver_name": "홍길동",
  "receiver_phone": "010-1234-5678",
  "receiver_addr": "12345 서울특별시 강남구 테헤란로 123 문 앞에 놓아주세요",
  "items": [
    {
      "productId": 10,
      "optionId": 101,
      "quantity": 2
    },
    {
      "productId": 11,
      "optionId": 201,
      "quantity": 1
    }
  ]
}
```

### Success Response

- **Code:** `201 Created`

```
200001
```

> 응답 body는 생성된 주문 ID(`Long`)를 plain text로 반환한다 (JSON 객체 아님).  
> `src/api/orderApi.js` `createOrder` `transformResponse`에서 `typeof res === 'number' ? res : Number(res)` 로 orderId를 추출.

### Error Response

- **Code:** `500 Internal Server Error`

---

## `GET /orders`

사용자의 주문 목록을 조회합니다.

### Query Parameters

| Parameter    | Type              | Required | Default | Description                                    |
| :----------- | :---------------- | :------: | :------ | :--------------------------------------------- |
| `start_date` | String (ISO Date) |    No    | -       | 조회 시작일 (예: `2024-04-01`)                 |
| `end_date`   | String (ISO Date) |    No    | -       | 조회 종료일 (예: `2024-04-22`)                 |
| `status`     | String (Enum)     |    No    | -       | 주문 상태 (`READY`, `SHIPPED`, `CANCELLED` 등) |
| `page`       | Integer           |    No    | `0`     | 페이지 번호 (0부터 시작)                       |

### Request Example

```http
GET /api/v1/orders?start_date=2026-04-01&end_date=2026-04-20&status=ORDER_COMPLETED&page=0
```

### Success Response

- **Code:** `200 OK`

```json
{
  "content": [
    {
      "order_id": 1,
      "user_id": 1,
      "amount": 35000,
      "receiver_name": "홍길동",
      "receiver_phone": "010-1234-5678",
      "receiver_addr": "서울특별시 강남구 테헤란로 123",
      "delete_yn": "N",
      "time": "2026-04-20T14:30:00",
      "order_state": "ORDER_COMPLETED",
      "failed_reason": null,
      "failed_at": null
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 20
  },
  "totalElements": 1,
  "totalPages": 1,
  "last": true,
  "first": true,
  "size": 20,
  "number": 0,
  "numberOfElements": 1,
  "empty": false
}
```

### Error Response

- **Code:** `500 Internal Server Error`

---

## `GET /orders/{order_id}`

주문 상세 정보를 조회합니다.

### Path Parameters

| Name       | Type     | Required | Description |
| :--------- | :------- | :------: | :---------- |
| `order_id` | `Number` |    ✅    | 주문 ID     |

### Success Response

- **Code:** `200 OK`

```json
{
  "order_id": 1,
  "user_id": 1,
  "user_name": "홍길동",
  "amount": 35000,
  "total_item_count": 2,
  "product_total_price": 35000,
  "payment_method": "CARD",
  "paid_amount": 35000,
  "receiver_name": "홍길동",
  "receiver_phone": "010-1234-5678",
  "receiver_addr": "서울특별시 강남구 테헤란로 123",
  "delete_yn": "N",
  "time": "2026-04-20T14:30:00",
  "order_state": "PAYMENT_COMPLETED",
  "failed_reason": null,
  "failed_at": null,
  "items": [
    {
      "product_id": 10,
      "option_id": 101,
      "product_name": "어글어글 동물복지 연어마들렌",
      "option_name": "단품",
      "price": 17500,
      "quantity": 2,
      "total_price": 35000
    }
  ]
}
```

### Error Response

- **Code:** `404 Not Found`

- **Code:** `500 Internal Server Error`

---

## `GET /orders/me/history`

로그인 사용자의 주문 상품 내역을 조회합니다.

주문 단위가 아니라 주문 상세 item 단위로 이력을 반환합니다.

#### Path Parameters

없음

#### Request Body

없음

### Success Response

- **Code:** `200 OK`

```json
[
  {
    "id": 1,
    "user_id": 1,
    "order_id": 10,
    "product_id": 100,
    "option_id": 1001,
    "product_name": "어글어글 동물복지 연어마들렌",
    "option_name": "단품",
    "price": 17500,
    "quantity": 2,
    "total_price": 35000,
    "order_state": "ORDER_COMPLETED",
    "failed_reason": null,
    "failed_at": null
  }
]
```

### No Content Response

- **Code:** `204 No Content`

사용자의 주문 내역이 없는 경우. 응답 body 없음. `transformResponse`에서 `res`가 falsy이면 빈 배열 반환.

### Error Response

- **Code:** `500 Internal Server Error`

응답 body 없음.

---

---

## `DELETE /orders/{order_id}`

주문 취소를 요청합니다.

### Path Parameters

| Name       | Type     | Required | Description |
| :--------- | :------- | :------: | :---------- |
| `order_id` | `Number` |    ✅    | 주문 ID     |

### Success Response

- **Code:** `202 Accepted`

응답 body 없음.

### Error Response

- **Code:** `404 Not Found`

- **Code:** `500 Internal Server Error`

---

## `GET /orders/{order_id}/cs-history`

주문 취소/교환/반품 내역을 조회합니다.

현재 `OrderService.getCsHistory()`는 빈 리스트를 반환하므로, 주문이 존재하면 `204 No Content`가 반환됩니다.

### Path Parameters

| Name       | Type     | Required | Description |
| :--------- | :------- | :------: | :---------- |
| `order_id` | `String` |    ✅    | 주문 ID     |

### Success Response

- **Code:** `200 OK`

```json
[
  {
    "order_id": 1,
    "user_id": 1,
    "amount": 35000,
    "receiver_name": "홍길동",
    "receiver_phone": "010-1234-5678",
    "receiver_addr": "서울특별시 강남구 테헤란로 123",
    "delete_yn": "N",
    "time": "2026-04-20T14:30:00",
    "order_state": "ORDER_COMPLETED",
    "failed_reason": null,
    "failed_at": null
  }
]
```

### Current Behavior

- **Code:** `204 No Content`

### Error Response

- **Code:** `404 Not Found`

- **Code:** `500 Internal Server Error`
