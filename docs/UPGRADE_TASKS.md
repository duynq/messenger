# Lộ trình nâng cấp Messenger — Task Breakdown

Tài liệu mô tả chi tiết từng task theo 5 phase. Mỗi task gồm: mục tiêu, phạm vi, tiêu chí hoàn thành, và gợi ý kỹ thuật.

---

## Phase 1 — Sửa lỗi & UX cốt lõi

> **Mục tiêu phase:** Sửa bug critical, cải thiện trải nghiệm cơ bản khi dùng chat hàng ngày.  
> **Thời gian ước tính:** 1–2 ngày  
> **Phụ thuộc:** Không

---

### Task 1.1 — Fix payload gửi tin nhắn (Critical Bug)

**Mô tả:**  
Frontend đang gửi `{ content }` trong khi Rails API yêu cầu `{ message: { content } }`. Điều này khiến REST endpoint trả về 400, tin nhắn chỉ hiện tạm thời qua WebSocket broadcast mà không persist đúng qua HTTP response.

**Phạm vi:**
- Sửa `frontend/src/actions/chat.ts` — `sendMessageAction`
- Kiểm tra các action khác có cùng pattern sai không
- Thêm/ cập nhật request spec nếu cần

**Tiêu chí hoàn thành:**
- [ ] POST `/api/v1/conversations/:id/messages` trả về `201 Created` với body đúng
- [ ] Tin nhắn được lưu DB và hiển thị sau khi refresh trang
- [ ] Không còn lỗi 400 khi gửi tin qua form

**Gợi ý kỹ thuật:**
```typescript
// Đổi từ:
body: JSON.stringify({ content })
// Thành:
body: JSON.stringify({ message: { content } })
```

**Effort:** ~30 phút | **Priority:** P0

---

### Task 1.2 — Unread count & badge trên danh sách hội thoại

**Mô tả:**  
Hiện tại user không biết cuộc trò chuyện nào có tin nhắn chưa đọc. Cần thêm số tin chưa đọc (badge) trên mỗi conversation card trong dashboard.

**Phạm vi:**
- Migration: thêm `last_read_at` vào `conversation_participants`
- Backend: tính `unread_count` khi list conversations
- Cập nhật `ConversationBlueprint` trả về `unread_count`
- API: endpoint hoặc logic mark-as-read khi mở chat
- Frontend: hiển thị badge trên `ConversationsList`

**Tiêu chí hoàn thành:**
- [ ] User thấy số tin chưa đọc trên mỗi conversation
- [ ] Mở chat → mark read → badge về 0
- [ ] Tin nhắn mới đến khi đang ở dashboard → badge tăng (real-time hoặc sau refresh)

**Gợi ý kỹ thuật:**
- `unread_count = messages.where('created_at > ?', participant.last_read_at).count`
- Mark read: `PATCH /conversations/:id/read` hoặc gọi trong `MessagesController#index`
- Broadcast event `conversation_updated` qua ActionCable khi có tin mới (optional phase 1)

**Effort:** ~4–6 giờ | **Priority:** P1

---

### Task 1.3 — Last message preview & sắp xếp theo hoạt động gần nhất

**Mô tả:**  
Danh sách conversation hiện sort theo `created_at`, không phản ánh cuộc trò chuyện nào vừa có tin mới. Cần hiển thị preview tin nhắn cuối và sort theo thời gian tin nhắn mới nhất.

**Phạm vi:**
- Migration: thêm `last_message_at` vào `conversations` (denormalize)
- Cập nhật `Messages::CreationService` set `last_message_at` khi tạo tin
- Backfill migration cho data hiện có
- `ConversationBlueprint`: thêm `last_message` (content rút gọn, sender, timestamp)
- `ConversationsController#index`: sort `ORDER BY last_message_at DESC NULLS LAST`
- Frontend: hiển thị preview dưới tên conversation

**Tiêu chí hoàn thành:**
- [ ] Conversation có tin mới nhất luôn nằm đầu danh sách
- [ ] Mỗi card hiển thị: "Tên người gửi: nội dung rút gọn..." + thời gian
- [ ] Group chat hiển thị tên người gửi trong preview

**Effort:** ~4–6 giờ | **Priority:** P1

---

### Task 1.4 — Typing indicator (đang soạn tin)

**Mô tả:**  
Khi user đang gõ tin nhắn, các thành viên khác trong cuộc trò chuyện thấy indicator "Đang soạn tin..." (hoặc tên user đang gõ).

**Phạm vi:**
- Backend: mở rộng `ConversationChannel` hoặc tạo `TypingChannel`
- Event: `{ type: 'typing', user_id, conversation_id }` — debounce 2–3 giờ TTL
- Frontend: `MessageForm` emit typing event (debounce ~300ms)
- Frontend: `ChatMessages` hiển thị indicator dưới header hoặc trên input

**Tiêu chí hoàn thành:**
- [ ] User A gõ → User B thấy "A đang soạn tin..."
- [ ] Indicator tự ẩn sau ~3s không gõ
- [ ] Group chat: hiển thị "A, B đang soạn tin..." (tối đa 2–3 tên)
- [ ] Không gửi typing event cho chính mình

**Gợi ý kỹ thuật:**
- Dùng Redis SET với TTL cho typing state (scale tốt hơn broadcast thuần)
- Hoặc broadcast qua ActionCable với client-side timeout

**Effort:** ~4–6 giờ | **Priority:** P1

---

### Task 1.5 — Hiển thị ConversationsList khi danh sách rỗng

**Mô tả:**  
Dashboard ẩn section conversations khi `conversations.length === 0`, khiến user mới không thấy nút "Tạo nhóm" / empty state hướng dẫn.

**Phạm vi:**
- Sửa `frontend/src/app/[locale]/dashboard/page.tsx`
- Thêm empty state UI với CTA: "Bắt đầu chat" / "Tạo nhóm"
- i18n cho các chuỗi mới (en/vi)

**Tiêu chí hoàn thành:**
- [ ] User mới đăng ký vẫn thấy section Conversations
- [ ] Empty state có nút tạo nhóm và hướng dẫn bắt đầu chat từ user directory
- [ ] Chuỗi i18n đầy đủ en/vi

**Effort:** ~1–2 giờ | **Priority:** P2

---

## Phase 2 — Quản lý tin nhắn

> **Mục tiêu phase:** Cho phép user tương tác sâu hơn với tin nhắn (xóa, sửa, trả lời, reaction).  
> **Thời gian ước tính:** 2–3 ngày  
> **Phụ thuộc:** Phase 1 (Task 1.1 nên xong trước)

---

### Task 2.1 — Xóa tin nhắn (Soft delete)

**Mô tả:**  
User có thể xóa tin nhắn của mình. Tin bị xóa không hiển thị nội dung gốc mà hiển thị placeholder "Tin nhắn đã bị xóa". Tận dụng cột `deleted_at` và concern `SoftDeletable` đã có sẵn.

**Phạm vi:**
- Backend: `DELETE /api/v1/conversations/:id/messages/:id`
- Service: `Messages::DeletionService` — soft delete, broadcast event
- Scope query: filter `where(deleted_at: nil)` hoặc dùng default scope từ concern
- `MessageBlueprint`: trả về `deleted: true`, ẩn `content` khi đã xóa
- Frontend: context menu trên bubble tin nhắn → "Xóa"
- Real-time: broadcast `{ type: 'message_deleted', message_id }`

**Tiêu chí hoàn thành:**
- [ ] Chỉ author mới xóa được tin của mình
- [ ] Tin đã xóa hiển thị placeholder, không hiện nội dung cũ
- [ ] Các client khác cập nhật real-time khi có tin bị xóa
- [ ] Admin group không xóa tin người khác (trừ khi có requirement riêng)

**Effort:** ~4–6 giờ | **Priority:** P1

---

### Task 2.2 — Sửa tin nhắn (trong khoảng thời gian giới hạn)

**Mô tả:**  
User có thể sửa nội dung tin nhắn đã gửi trong vòng 15 phút. Tin đã sửa hiển thị nhãn "đã chỉnh sửa".

**Phạm vi:**
- Migration: thêm `edited_at` vào `messages`
- Backend: `PATCH /api/v1/conversations/:id/messages/:id`
- Service: `Messages::UpdateService` — validate ownership + time window
- `MessageBlueprint`: thêm `edited_at`
- Frontend: inline edit hoặc modal edit trên bubble của mình
- Real-time: broadcast `{ type: 'message_updated', message }`

**Tiêu chí hoàn thành:**
- [ ] Sửa được trong 15 phút sau khi gửi
- [ ] Sau 15 phút API trả 422 với message rõ ràng
- [ ] UI hiển thị "(đã chỉnh sửa)" khi `edited_at` present
- [ ] Real-time sync cho các client khác

**Effort:** ~4–6 giờ | **Priority:** P1

---

### Task 2.3 — Reply to message (Trả lời tin nhắn)

**Mô tả:**  
User có thể trả lời một tin nhắn cụ thể. Bubble reply hiển thị snippet tin gốc phía trên nội dung mới.

**Phạm vi:**
- Migration: thêm `reply_to_id` (FK → messages) vào `messages`
- Backend: cho phép `reply_to_id` trong create params, validate cùng conversation
- `MessageBlueprint`: nested `reply_to` (id, content rút gọn, user)
- Frontend: nút "Trả lời" trên bubble → hiện preview bar trên input
- Frontend: render reply snippet trong message bubble

**Tiêu chí hoàn thành:**
- [ ] Reply hiển thị đúng tin gốc (tên + nội dung rút gọn)
- [ ] Click snippet reply scroll/jump tới tin gốc (optional)
- [ ] Không reply được tin đã xóa (hoặc hiển thị "Tin nhắn đã bị xóa")
- [ ] Hoạt động trong cả DM và group chat

**Effort:** ~6–8 giờ | **Priority:** P1

---

### Task 2.4 — Emoji reactions

**Mô tả:**  
User có thể react tin nhắn bằng emoji (👍 ❤️ 😂 😮 😢). Một user chỉ 1 reaction/tin; click lại cùng emoji = bỏ reaction.

**Phạm vi:**
- Migration: bảng `message_reactions` (`message_id`, `user_id`, `emoji`, unique index)
- Backend: `POST/DELETE /messages/:id/reactions`
- `MessageBlueprint`: thêm `reactions` grouped by emoji + count + `reacted_by_me`
- Frontend: hover/long-press bubble → reaction picker
- Frontend: hiển thị reaction bar dưới bubble
- Real-time: broadcast reaction changes

**Tiêu chí hoàn thành:**
- [ ] Thêm/bỏ reaction hoạt động toggle
- [ ] Hiển thị count và highlight emoji user đã chọn
- [ ] Real-time sync reactions
- [ ] Group chat: tooltip ai đã react (optional)

**Effort:** ~6–8 giờ | **Priority:** P2

---

### Task 2.5 — Emoji picker trong MessageForm

**Mô tả:**  
Thêm nút emoji bên cạnh input để chèn emoji vào nội dung tin nhắn (khác với reaction ở Task 2.4).

**Phạm vi:**
- Frontend: component `EmojiPicker` (dùng thư viện như `emoji-picker-react` hoặc native grid)
- Tích hợp vào `MessageForm`
- i18n, accessibility (keyboard nav)

**Tiêu chí hoàn thành:**
- [ ] Click emoji → chèn vào vị trí cursor trong textarea
- [ ] Picker đóng sau khi chọn
- [ ] Hoạt động mobile (touch)

**Effort:** ~2–4 giờ | **Priority:** P2

---

## Phase 3 — Media & Profile

> **Mục tiêu phase:** Hỗ trợ file/ảnh và profile phong phú hơn. Tận dụng MinIO + Active Storage đã cấu hình.  
> **Thời gian ước tính:** 2–3 ngày  
> **Phụ thuộc:** Phase 1

---

### Task 3.1 — Upload ảnh/file đính kèm tin nhắn

**Mô tả:**  
User gửi được ảnh (jpg, png, gif, webp) và file (pdf, doc — giới hạn loại/size). File lưu qua Active Storage + MinIO.

**Phạm vi:**
- Model: `Message has_many_attached :attachments`
- Migration: có thể không cần nếu dùng Active Storage polymorphic
- Backend: multipart upload endpoint hoặc direct upload (presigned URL)
- Validate: max size (e.g. 10MB), allowed MIME types
- `MessageBlueprint`: trả về `attachments[]` với URL
- Frontend: nút attach file, preview trước khi gửi
- Frontend: render ảnh inline, file dạng download card

**Tiêu chí hoàn thành:**
- [ ] Upload ảnh hiển thị inline trong chat
- [ ] Upload file non-image hiển thị tên + nút download
- [ ] Reject file quá lớn / sai loại với thông báo rõ
- [ ] Real-time: tin có attachment broadcast đúng

**Gợi ý kỹ thuật:**
- Direct upload flow: Rails Active Storage direct upload + `@rails/activestorage` hoặc custom presigned
- MinIO bucket đã setup trong `docker-compose.yml`

**Effort:** ~8–12 giờ | **Priority:** P1

---

### Task 3.2 — Avatar user

**Mô tả:**  
User upload ảnh đại diện, hiển thị thay cho chữ cái đầu (initial) hiện tại.

**Phạm vi:**
- Model: `User has_one_attached :avatar`
- Backend: `PATCH /api/v1/account` nhận avatar (multipart)
- Generate variant thumbnail (100x100)
- `UserBlueprint`: thêm `avatar_url`
- Frontend: upload trong Settings, hiển thị avatar ở sidebar, chat header, message bubble

**Tiêu chí hoàn thành:**
- [ ] Upload/xóa avatar trong Settings
- [ ] Avatar hiển thị nhất quán toàn app
- [ ] Fallback initial letter khi chưa có avatar
- [ ] Image variant tối ưu bandwidth

**Effort:** ~4–6 giờ | **Priority:** P1

---

### Task 3.3 — Avatar group chat

**Mô tả:**  
Admin group có thể đặt ảnh đại diện cho nhóm. Nếu không có, hiển thị collage initials của 2–3 thành viên.

**Phạm vi:**
- Model: `Conversation has_one_attached :avatar` (chỉ group)
- Backend: `PATCH /api/v1/conversations/:id` (admin only)
- Frontend: upload trong `GroupSettingsModal`
- Frontend: hiển thị avatar group trong conversation list + chat header

**Tiêu chí hoàn thành:**
- [ ] Chỉ admin upload avatar group
- [ ] Fallback UI khi chưa có avatar
- [ ] Cập nhật real-time hoặc sau refresh

**Effort:** ~3–4 giờ | **Priority:** P2

---

### Task 3.4 — Server-side user search

**Mô tả:**  
Thay client-side filter bằng API search thật theo tên/email. README đã claim feature này nhưng chưa implement.

**Phạm vi:**
- Backend: `GET /api/v1/users?q=keyword` — ILIKE trên first_name, last_name, email
- Index DB nếu cần (pg_trgm cho search tốt hơn — optional)
- Frontend: search input trên dashboard + trong modals (CreateGroup, AddMember)
- Debounce 300ms tratar minimum 2 ký tự

**Tiêu chí hoàn thành:**
- [ ] Search "john" trả về user match tên hoặc email
- [ ] Không trả về chính mình
- [ ] Pagination vẫn hoạt động kết hợp search
- [ ] Empty state khi không có kết quả

**Effort:** ~3–4 giờ | **Priority:** P1

---

## Phase 4 — Engagement & Group management

> **Mục tiêu phase:** Tăng engagement, quản lý nhóm đầy đủ hơn, thông báo in-app.  
> **Thời gian ước tính:** 3–5 ngày  
> **Phụ thuộc:** Phase 1 (unread), Phase 2 (optional cho system messages)

---

### Task 4.1 — Read receipts (Đã gửi / Đã xem)

**Mô tả:**  
Trong DM, hiển thị trạng thái tin nhắn: đã gửi ✓, đã đọc ✓✓. Dựa trên `last_read_at` của participant.

**Phạm vi:**
- Tận dụng `last_read_at` từ Task 1.2
- Backend: expose read status trong message hoặc conversation meta
- Frontend: icon ✓/✓✓ dưới bubble tin cuối (chỉ DM, hoặc group với logic riêng)
- Real-time: cập nhật khi partner mark read

**Tiêu chí hoàn thành:**
- [ ] DM: tin cuối hiển thị ✓ khi gửi, ✓✓ khi partner đã mở chat
- [ ] Không hiển thị read receipt trên tin người khác gửi
- [ ] Group chat: có thể defer hoặc hiển thị "X/Y đã xem"

**Effort:** ~4–6 giờ | **Priority:** P1

---

### Task 4.2 — In-app notification center

**Mô tả:**  
Bell icon trên header hiển thị thông báo: tin nhắn mới, được thêm vào group, v.v.

**Phạm vi:**
- Migration: bảng `notifications` (`user_id`, `type`, `data` JSONB, `read_at`)
- Backend: tạo notification khi có tin mới (user không đang trong conversation)
- API: `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read_all`
- Frontend: `NotificationBell` component + dropdown list
- Real-time: broadcast qua `NotificationChannel`

**Tiêu chí hoàn thành:**
- [ ] Badge số notification chưa đọc
- [ ] Click notification → navigate tới conversation
- [ ] Mark read individual / mark all read
- [ ] Không notify tin trong conversation đang mở

**Effort:** ~8–12 giờ | **Priority:** P1

---

### Task 4.3 — Mute / Unmute conversation

**Mô tả:**  
User tắt thông báo cho một cuộc trò chuyện cụ thể mà không rời khỏi conversation.

**Phạm vi:**
- Migration: thêm `muted_at` vào `conversation_participants`
- Backend: `PATCH /conversations/:id/mute`, `PATCH .../unmute`
- Logic: skip notification creation khi participant muted
- Frontend: toggle trong conversation menu / group settings

**Tiêu chí hoàn thành:**
- [ ] Mute → không nhận notification, vẫn thấy tin trong chat
- [ ] Unmute → nhận notification lại
- [ ] UI indicator conversation đang mute

**Effort:** ~3–4 giờ | **Priority:** P2

---

### Task 4.4 — System messages (Tin nhắn hệ thống)

**Mô tả:**  
Tự động tạo tin hệ thống khi: thành viên join/leave group, đổi tên group, admin chuyển quyền.

**Phạm vi:**
- Migration: thêm `message_type` enum (`user`, `system`) vào `messages`; `content` nullable cho system
- Service: `Messages::SystemMessageService`
- Hook vào: add/remove participant, rename group, transfer admin
- Frontend: render system message centered, style khác bubble thường
- i18n: "Alice đã tham gia nhóm", "Bob đã rời nhóm"

**Tiêu chí hoàn thành:**
- [ ] Join/leave/rename tạo system message
- [ ] System message không có reaction/reply/edit
- [ ] Real-time broadcast

**Effort:** ~4–6 giờ | **Priority:** P2

---

### Task 4.5 — Rename group

**Mô tả:**  
Admin có thể đổi tên group chat.

**Phạm vi:**
- Backend: `PATCH /api/v1/conversations/:id` với `{ name }` — admin only
- Service: validate + tạo system message (Task 4.4)
- Frontend: input rename trong `GroupSettingsModal`
- Real-time: broadcast conversation update

**Tiêu chí hoàn thành:**
- [ ] Chỉ admin đổi tên
- [ ] Tên mới hiển thị ngay trên header + conversation list
- [ ] System message ghi nhận đổi tên

**Effort:** ~2–3 giờ | **Priority:** P2

---

### Task 4.6 — Transfer admin & admin leave group

**Mô tả:**  
Admin có thể chuyển quyền admin cho thành viên khác trước khi rời nhóm. Hiện UI chặn admin leave.

**Phạm vi:**
- Backend: `PATCH /conversations/:id/transfer_admin` với `user_id`
- Validate: target phải là participant
- Cập nhật `conversations.admin_id`
- Frontend: dropdown chọn admin mới trong GroupSettings → sau đó cho phép Leave
- System message khi transfer

**Tiêu chí hoàn thành:**
- [ ] Transfer admin thành công
- [ ] Admin cũ có thể leave sau khi transfer
- [ ] Nếu admin là người duy nhất → không cho leave (hoặc xóa group)

**Effort:** ~3–4 giờ | **Priority:** P2

---

## Phase 5 — Nâng cao (Optional)

> **Mục tiêu phase:** Tính năng enterprise/advanced, infrastructure, scale.  
> **Thời gian ước tính:** 1–2 tuần+ (tùy scope)  
> **Phụ thuộc:** Phase 1–4 ổn định

---

### Task 5.1 — Message search (Full-text)

**Mô tả:**  
User tìm kiếm tin nhắn theo keyword trong toàn bộ conversations hoặc trong một conversation cụ thể.

**Phạm vi:**
- PostgreSQL `tsvector` + GIN index trên `messages.content`
- API: `GET /messages/search?q=keyword&conversation_id=optional`
- Frontend: search bar global hoặc trong chat
- Highlight keyword trong kết quả

**Tiêu chí hoàn thành:**
- [ ] Search trả kết quả có pagination
- [ ] Click result → jump tới tin trong conversation
- [ ] Performance acceptable với 100k+ messages (index)

**Effort:** ~8–12 giờ | **Priority:** P3

---

### Task 5.2 — Push notifications (Web Push)

**Mô tả:**  
Gửi push notification tới browser khi user offline/background tab và có tin mới.

**Phạm vi:**
- Service Worker trong Next.js
- Backend: lưu push subscription, gửi qua Web Push API (VAPID)
- Gem: `webpush` hoặc tương đương
- Frontend: prompt permission, subscribe/unsubscribe trong Settings
- Tôn trọng mute settings (Task 4.3)

**Tiêu chí hoàn thành:**
- [ ] User grant permission → nhận push khi tab background
- [ ] Click push → mở đúng conversation
- [ ] Unsubscribe hoạt động

**Effort:** ~12–16 giờ | **Priority:** P3

---

### Task 5.3 — @Mentions trong group chat

**Mô tả:**  
Gõ `@tên` để mention thành viên. User được mention nhận notification ưu tiên.

**Phạm vi:**
- Parse `@full_name` hoặc `@email` trong content
- Migration: bảng `message_mentions` hoặc lưu trong JSONB
- Notification riêng cho mention
- Frontend: autocomplete khi gõ `@`
- Highlight mention trong bubble

**Tiêu chí hoàn thành:**
- [ ] Autocomplete member khi gõ @
- [ ] Mentioned user nhận notification
- [ ] Mention highlighted trong UI

**Effort:** ~8–12 giờ | **Priority:** P3

---

### Task 5.4 — Link preview (Open Graph)

**Mô tả:**  
Tin nhắn chứa URL tự động hiển thị preview card (title, description, image).

**Phạm vi:**
- Backend: job fetch OG metadata (background job — Sidekiq hoặc ActiveJob)
- Cache preview data
- `MessageBlueprint`: thêm `link_preview`
- Frontend: render preview card dưới URL
- Rate limit / SSRF protection khi fetch URL

**Tiêu chí hoàn thành:**
- [ ] URL trong tin hiển thị preview
- [ ] Không block gửi tin khi preview fail
- [ ] An toàn trước SSRF

**Effort:** ~8–12 giờ | **Priority:** P3

---

### Task 5.5 — CI/CD pipeline

**Mô tả:**  
GitHub Actions chạy test, lint, build Docker trên mỗi PR/push.

**Phạm vi:**
- `.github/workflows/ci.yml`
- Jobs: RSpec, ESLint, `npm run build`, Docker build
- Badge trong README

**Tiêu chí hoàn thành:**
- [ ] PR bị block nếu test fail
- [ ] Lint pass cho cả backend và frontend
- [ ] Build Docker thành công

**Effort:** ~4–6 giờ | **Priority:** P2

---

### Task 5.6 — Test coverage nâng cao

**Mô tả:**  
Bổ sung test cho chat flows, WebSocket, group management. Frontend thêm Jest/RTL tests.

**Phạm vi:**
- Backend: request specs cho messages, conversations, participants
- Backend: channel specs (ActionCable)
- Frontend: component tests cho ChatMessages, MessageForm
- Sửa stale spec (`user_spec.rb` references `posts`)

**Tiêu chí hoàn thành:**
- [ ] Core chat API có request spec coverage
- [ ] Ít nhất 5 frontend component tests
- [ ] Không còn pending/stale model specs

**Effort:** ~12–16 giờ | **Priority:** P2

---

### Task 5.7 — Swagger API documentation đầy đủ

**Mô tả:**  
Mở rộng Swagger từ 4 endpoint hiện tại lên toàn bộ API surface.

**Phạm vi:**
- RSwag specs cho: conversations, messages, participants, account
- Cập nhật `swagger/v1/swagger.yaml`
- Document WebSocket events trong README hoặc separate doc

**Tiêu chí hoàn thành:**
- [ ] Tất cả REST endpoints documented
- [ ] Request/response examples
- [ ] Auth header documented

**Effort:** ~6–8 giờ | **Priority:** P2

---

### Task 5.8 — Cải thiện Presence (initial snapshot)

**Mô tả:**  
Client mới connect không biết ai đang online. Cần gửi snapshot danh sách online users khi subscribe PresenceChannel.

**Phạm vi:**
- Backend: `PresenceChannel#subscribed` broadcast `{ type: 'snapshot', online_user_ids: [...] }`
- Track online users in Redis SET
- Frontend: `PresenceProvider` merge snapshot vào state

**Tiêu chí hoàn thành:**
- [ ] Mở app → thấy đúng ai đang online ngay lập tức
- [ ] Không duplicate online/offline events

**Effort:** ~3–4 giờ | **Priority:** P2

---

## Tổng hợp theo priority

| Priority | Tasks |
|----------|-------|
| **P0** | 1.1 |
| **P1** | 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 3.4, 4.1, 4.2 |
| **P2** | 1.5, 2.4, 2.5, 3.3, 4.3, 4.4, 4.5, 4.6, 5.5, 5.6, 5.7, 5.8 |
| **P3** | 5.1, 5.2, 5.3, 5.4 |

---

## Thứ tự implement đề xuất

```
Phase 1:  1.1 → 1.5 → 1.3 → 1.2 → 1.4
Phase 2:  2.1 → 2.2 → 2.3 → 2.5 → 2.4
Phase 3:  3.4 → 3.2 → 3.1 → 3.3
Phase 4:  4.1 → 4.2 → 4.3 → 4.4 → 4.5 → 4.6
Phase 5:  5.8 → 5.5 → 5.6 → 5.7 → (5.1–5.4 tùy nhu cầu)
```

---

*Tài liệu tạo ngày: 2026-06-27. Cập nhật khi hoàn thành task — đánh dấu `[x]` trong tiêu chí hoàn thành.*
