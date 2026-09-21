# Лаборатори №3 — Чанарын сценарио → SLO → k6 threshold

Оюутны нэр: Э.Батхүлэг  
Оюутны код: B232270040

## Орчин

- Үйлдлийн систем: Windows
- Node.js: v22.14.0
- API: Express, `http://localhost:3000`
- k6 version:

```text
k6.exe v2.2.0 (commit/00a9a1b7f5, go1.26.5, windows/amd64)
```

## Чанарын сценарио

### 1. Performance — сагсанд нэмэх

| Хэсэг | Тодорхойлолт |
|---|---|
| Тойм | Хэрэглэгч барааг сагсандаа нэмэх үед API хурдан хариулах ёстой. |
| Системийн төлөв | Express API сервер хэвийн ажиллаж, `/cart/add` endpoint хүсэлт хүлээн авч байна. |
| Орчны төлөв | Локал Windows машин дээр 20 VU тогтмол ачаалалтай, 1 минутын турш ажиллана. |
| Гадаад өдөөлт | Хэрэглэгчийн `POST /cart/add` үйлдэл. |
| Шаардлагатай хариу | Сервер 200 хариу өгч, сагсанд нэг бараа нэмэгдсэнийг буцаана. |
| Хэмжүүр | `/cart/add` latency-ийн p95 нь эхний бодит хэмжилтээр тогтоох SLO босгоос бага байх ёстой. |

### 2. Reliability — төлбөрийн үйлдэл

| Хэсэг | Тодорхойлолт |
|---|---|
| Тойм | Хэвийн хэрэглэгчийн төлбөрийн үйлдэлд төлбөрийн endpoint-ийн эвдрэлийн давтамж хянагдах ёстой. |
| Системийн төлөв | Express API сервер хэвийн ажиллаж, `/pay` endpoint хүсэлтийн ойролцоогоор 5%-д 500 алдаа буцаахаар зориудаар тохируулагдсан. |
| Орчны төлөв | Локал Windows машин дээр 20 VU тогтмол ачаалалтай, 1 минутын турш ажиллана. |
| Гадаад өдөөлт | Хэрэглэгчийн `POST /pay` төлбөрийн үйлдэл. |
| Шаардлагатай хариу | Амжилттай төлбөрт 200, зориудаар загварчилсан gateway failure-д 500 хариу өгнө. |
| Хэмжүүр | `/pay` endpoint-ийн POFOD буюу error rate нь бодит 5%-ийн алдаанаас үндэслэсэн SLO босгоос бага байх ёстой. |

### 3. Availability — серверийн гэнэтийн зогсолт

| Хэсэг | Тодорхойлолт |
|---|---|
| Тойм | Сервер гэнэт зогсоод дахин асах үед үйлчилгээний availability хэмжигдэх ёстой. |
| Системийн төлөв | Express API эхэндээ хэвийн ажиллаж, chaos test-ийн үеэр Ctrl+C-ээр 10 секунд зогсоон дахин асаана. |
| Орчны төлөв | Локал Windows машин дээр 20 VU ачаалалтай, 2 минутын тестийн цонх ажиллана. |
| Гадаад өдөөлт | Серверийн crash болон 10 секундын тасалдал. |
| Шаардлагатай хариу | Сервер дахин асмагц endpoint-ууд хүсэлт хүлээн авч, тестийн үлдсэн хугацаанд хариулна. |
| Хэмжүүр | Бүх check-ийн request-based availability хувь нь SLO босгоос багагүй, сэргэх хугацаа 10 секунд байна. |

## SLO ба threshold

| Сценарио | SLI | Босго | Цонх / нөхцөл | k6 threshold |
|---|---|---:|---|---|
| Performance | `/cart/add` latency | p95 < 30 ms | 20 VU тогтмол ачаалал, 1 минут | `http_req_duration{name:cart}: p(95)<30` |
| Reliability | `/pay` error rate | < 8% | 20 VU тогтмол ачаалал, 1 минут | `http_req_failed{name:pay}: rate<0.08` |
| Availability | Бүх check-ийн request-based availability | > 90% | 20 VU, 2 минут; 10 секунд server stop орсон | `checks: rate>0.90` |
| Нэмэлт performance | `/report` latency | p95 < 450 ms | 20 VU тогтмол ачаалал, 1 минут | `http_req_duration{name:report}: p(95)<450` |

`/cart/add` нь локал, хөнгөн endpoint тул p95 < 30 ms босго сонгосон; 200 ms нь бодит гүйцэтгэлийг ялгахгүй хэт сул байх болно. `/report` нь 200–400 ms зориудын сааталтай учраас p95 < 450 ms босго бодитой нөөцтэй. `/pay` endpoint-ийн загварчилсан алдаа ойролцоогоор 5% тул < 8% босго нь хэвийн хэлбэлзлийг зөвшөөрнө. Availability-ийн 90% SLO нь 2 минутын цонхонд 12 секундийн хугацааны error budget өгнө.

## Normal PASS test

20 VU, 1 минутын normal test-д бүх threshold PASS болсон.

- `/cart/add` p95: 3.94 ms (`p(95)<30` PASS)
- `/report` p95: 395.53 ms (`p(95)<450` PASS)
- `/pay` error rate: 5.39% (`rate<0.08` PASS)
- Request-based availability (`checks`): 98.20% (`rate>0.90` PASS)

Бүтэн k6 гаралт: [`results/pass.txt`](results/pass.txt). Screenshot: [normal PASS output](screenshots/pass.png).

## Chaos test — 10 секундийн server stop

`slo-test.js`-ийг `--duration 2m` тохиргоотой ажиллуулж байх үед local Express server-ийг Ctrl+C-ээр зогсоож, 10 секундийн дараа дахин `node server.js` командаар асаасан. Бодит request-based availability нь `4,844 / 5,697 = 85.02%` болсон тул `rate>0.90` availability threshold FAIL болов.

- Cart p95: 2.58 ms (`p(95)<30` PASS)
- Report p95: 395.98 ms (`p(95)<450` PASS)
- Pay error rate: 17.79% (`rate<0.08` FAIL)
- Бүх HTTP хүсэлтийн error rate: 14.97% (853 / 5,697)
- Request-based availability: 85.02% (4,844 / 5,697; `rate>0.90` FAIL)

90%-ийн availability SLO нь 5,697 checks дээр хамгийн ихдээ ойролцоогоор 570 failed check зөвшөөрнө. Бодит 853 failed check гарсан нь request-based error budget-ийг ойролцоогоор 283 check-ээр хэтрүүлсэн. Харин 2 минутын цонхонд тооцсон time-based budget 12 секунд байсан ч server унахад connection-refused хүсэлтүүд `/report`-ын 200–400 ms хүлээлтгүйгээр хурдан буцдаг тул нэг секундэд илүү олон failed request бүртгэгдэж, request-based budget богино хугацаанд хэтэрсэн.

Chaos үед server унасан тул `/pay` хүсэлтүүд ч зэрэг унаж reliability threshold мөн FAIL болсон. Availability SLI-г reliability-гээс тусгаарлахын тулд availability check-д зөвхөн cart/report зэрэг endpoint-уудын health check-ийг оруулж, `/pay`-ийн endpoint tag-тэй error rate-ийг reliability SLI болгон тусад нь үнэлж болно.

Бүтэн k6 гаралт: [`results/chaos.txt`](results/chaos.txt). Screenshots: [chaos summary](screenshots/chaos.png), [chaos thresholds](screenshots/chaos-thresholds.png).

## Зориуд FAIL болгосон threshold

`slo-test-fail.js` нь normal test-тэй ижил 20 VU, 1 минутын тохиргоотой боловч `/report` threshold-ийг зориудаар `p(95)<100` болгон хатууруулсан. `/report` endpoint нь 200–400 ms сааталтай тул бодит p95 `398.71 ms` гарч threshold FAIL болсон.

- `/report` p95: 398.71 ms (`p(95)<100` FAIL)
- `/cart/add` p95: 3.99 ms (`p(95)<30` PASS)
- `/pay` error rate: 4.89% (`rate<0.08` PASS)
- Availability (`checks`): 98.36% (`rate>0.90` PASS)
- k6 exit code: 99

k6 нь `thresholds on metrics 'http_req_duration{name:report}' have been crossed` error-оор гарсан бөгөөд PowerShell-ийн `$LASTEXITCODE` нь `99` болсон. Энэ exit code-г CI pipeline quality gate ашиглан build-ийг зогсооход ашиглаж болно.

Бүтэн k6 гаралт: [`results/fail.txt`](results/fail.txt). Screenshots: [FAIL summary and exit code](screenshots/fail.png), [FAIL thresholds](screenshots/fail-thresholds.png).

## Дүгнэлт

1. Энэ лабораторид чанарын сценариог SLI, SLO, дараа нь k6 threshold болгон хөрвүүлж автомат шалгалт хийсэн.
2. Normal PASS test-д `/cart/add` p95 3.94 ms гарсан нь локал хөнгөн endpoint-д сонгосон 30 ms босгыг хангалттай нарийн шалгаж байгааг харуулсан.
3. `/report` endpoint-ийн normal p95 395.53 ms нь зориудын 200–400 ms сааталтай нийцэж, 450 ms SLO-г хангасан.
4. `/pay` endpoint-ийн normal error rate 5.39% байсан нь загварчилсан 5%-ийн алдааны давтамжтай ойролцоо бөгөөд 8%-ийн reliability SLO-г хангасан.
5. Normal test-ийн request-based availability 98.20% байсан тул 90%-ийн availability SLO PASS болсон.
6. Chaos test-д 10 секунд server зогсооход availability 85.02% болж, request-based error budget ойролцоогоор 283 check-ээр хэтэрсэн.
7. Цагаар тооцсон 12 секундийн budget болон хүсэлтээр тооцсон budget зөрсөн нь server унахад connection-refused хүсэлтүүд удаан `/report` хариуг хүлээхгүй хурдан буцсантай холбоотой.
8. Chaos үед `/pay` error rate 17.79% болсон нь нэг server crash availability болон reliability SLO-г зэрэг зөрчиж болохыг баталсан.
9. Хамгийн хэцүү хэсэг нь бодит системийн зан төлөвт тохирсон босго сонгох байсан бөгөөд зориудын `p(95)<100` threshold-ийн 398.71 ms FAIL нь сценарийн бодит нөхцөлгүй SLO утга утгагүйг харуулсан.
