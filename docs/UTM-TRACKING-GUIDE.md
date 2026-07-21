# GStar UTM Tracking — Hướng dẫn cho Marketing Team

## Mục lục
1. [UTM là gì](#1-utm-là-gì)
2. [Các tham số UTM](#2-các-tham-số-utm)
3. [Cách tạo link UTM](#3-cách-tạo-link-utm)
4. [Quy chuẩn đặt tên](#4-quy-chuẩn-đặt-tên)
5. [Cách hệ thống ghi nhận](#5-cách-hệ-thống-ghi-nhận)
6. [Xem dữ liệu UTM](#6-xem-dữ-liệu-utm)
7. [Checklist Marketing](#7-checklist-marketing)
8. [Lưu ý quan trọng](#8-lưu-ý-quan-trọng)

---

## 1. UTM là gì

UTM (Urchin Tracking Module) là các tham số được gắn vào cuối URL để theo dõi nguồn traffic đến website. Khi user nhấp vào link có UTM, hệ thống tự động ghi lại:

- **Họ đến từ đâu** (Facebook, Google, Email, etc.)
- **Qua kênh nào** (quảng cáo trả phí, organic, email)
- **Chiến dịch nào** (tuyển sinh, học bổng, early bird)
- **Hành trình đầy đủ** — từ lần đầu tiếp xúc đến khi nộp đơn

Dữ liệu này giúp:
- Biết **kênh nào mang lại nhiều ứng viên nhất**
- Tính **chi phí trên mỗi conversion (CPA)**
- Tối ưu **ngân sách quảng cáo** cho từng kênh

---

## 2. Các tham số UTM

### 2.1. UTM cơ bản (6 tham số)

| Tham số | Bắt buộc | Mô tả | Ví dụ |
|---|---|---|---|
| `utm_source` | Có | Nguồn traffic — nền tảng nào | `facebook`, `google`, `linkedin`, `newsletter` |
| `utm_medium` | Có | Loại kênh — trả phí hay tự nhiên | `paid_social`, `cpc`, `email`, `organic_social` |
| `utm_campaign` | Có | Tên chiến dịch | `gstar_scholarship`, `july_intake` |
| `utm_content` | Không | Phân biệt nhiều ads trong 1 campaign | `banner_top`, `carousel_v2` |
| `utm_term` | Không | Từ khóa (chủ yếu cho Google Search) | `ai_bootcamp`, `llm_training` |
| `utm_id` | Không | ID chiến dịch nội bộ | `camp_001` |

### 2.2. Click IDs (tự động ghi)

Các nền tảng quảng cáo tự động thêm click ID vào URL. **Không cần làm gì thủ công.**

| Click ID | Nền tảng | Tự động | Mô tả |
|---|---|---|---|
| `gclid` | Google Ads | Có | Google Click Identifier |
| `gbraid` | Google Ads (iOS app) | Có | Google Ads app conversion |
| `wbraid` | Google Ads (web) | Có | Google Ads web conversion |
| `fbclid` | Facebook / Meta Ads | Có | Facebook Click Identifier |
| `ttclid` | TikTok Ads | Có | TikTok Click Identifier |
| `msclkid` | Microsoft Ads | Có | Microsoft Click ID |
| `li_fat_id` | LinkedIn Ads | Có | LinkedIn First-Party Ad Tracking |

Hệ thống lưu trữ các click ID này để:
- Khớp conversion với click quảng cáo cụ thể
- Gửi dữ liệu server-side về Meta (Conversions API) — bypass ad-blocker
- Dùng cho Google Enhanced Conversions (tương lai)

---

## 3. Cách tạo link UTM

### 3.1. Công thức chung

```
https://summit.newturing.ai/gstar/?utm_source=SOURCE&utm_medium=MEDIUM&utm_campaign=CAMPAIGN&utm_content=CONTENT
```

### 3.2. Ví dụ theo từng kênh

#### Facebook Ads
```
https://summit.newturing.ai/gstar/?utm_source=facebook&utm_medium=paid_social&utm_campaign=gstar_scholarship&utm_content=carousel_v1
```

#### Google Search Ads
```
https://summit.newturing.ai/gstar/?utm_source=google&utm_medium=cpc&utm_campaign=brand_term&utm_term=gstar+bootcamp
```

#### LinkedIn Ads
```
https://summit.newturing.ai/gstar/?utm_source=linkedin&utm_medium=paid_social&utm_campaign=ai_engineers_2026
```

#### TikTok Ads
```
https://summit.newturing.ai/gstar/?utm_source=tiktok&utm_medium=paid_social&utm_campaign=gstar_viral&utm_content=video_15s
```

#### Email Newsletter
```
https://summit.newturing.ai/gstar/?utm_source=nti_newsletter&utm_medium=email&utm_campaign=july_intake&utm_content=header_button
```

#### YouTube (organic — mô tả video)
```
https://summit.newturing.ai/gstar/?utm_source=youtube&utm_medium=organic_social&utm_campaign=mentor_stories
```

#### Facebook post (organic)
```
https://summit.newturing.ai/gstar/?utm_source=facebook&utm_medium=organic_social&utm_campaign=thang_post_july
```

#### Zalo post
```
https://summit.newturing.ai/gstar/?utm_source=zalo&utm_medium=organic_social&utm_campaign=july_intake
```

#### X (Twitter)
```
https://summit.newturing.ai/gstar/?utm_source=x&utm_medium=organic_social&utm_campaign=gstar_launch
```

---

## 4. Quy chuẩn đặt tên

### 4.1. Bảng chuẩn source/medium

| Kênh | utm_source | utm_medium |
|---|---|---|
| Facebook Ads | `facebook` | `paid_social` |
| Facebook organic | `facebook` | `organic_social` |
| Google Search Ads | `google` | `cpc` |
| Google Display Ads | `google` | `display` |
| LinkedIn Ads | `linkedin` | `paid_social` |
| LinkedIn organic | `linkedin` | `organic_social` |
| TikTok Ads | `tiktok` | `paid_social` |
| YouTube Ads | `youtube` | `paid_video` |
| YouTube organic | `youtube` | `organic_social` |
| Email newsletter | `nti_newsletter` | `email` |
| X (Twitter) | `x` | `organic_social` |
| Zalo | `zalo` | `organic_social` |
| Direct (không UTM) | — | — |

### 4.2. Quy tắc đặt tên campaign

**Format:**
```
[Chương trình]_[Mục đích]_[Tháng/năm]
```

**Ví dụ:**
| Tên campaign | Mô tả |
|---|---|
| `gstar_scholarship` | Chiến dịch học bổng |
| `gstar_intake_jul` | Tuyển sinh tháng 7 |
| `gstar_mentor_stories` | Chia sẻ mentor |
| `gstar_early_bird` | Early bird deadline |
| `gstar_final_deadline` | Deadline cuối |
| `gstar_curriculum` | Giới thiệu curriculum |

### 4.3. Quy tắc utm_content

Dùng để phân biệt **nhiều quảng cáo trong cùng 1 campaign**:

| utm_content | Mô tả |
|---|---|
| `banner_top` | Banner ở đầu trang |
| `carousel_v1` | Version 1 của carousel |
| `carousel_v2` | Version 2 của carousel |
| `video_30s` | Video 30 giây |
| `video_60s` | Video 60 giây |
| `cta_apply` | Nút Apply |
| `cta_learn_more` | Nút Learn more |
| `header_button` | Nút ở header email |
| `footer_link` | Link ở footer email |

---

## 5. Cách hệ thống ghi nhận

### 5.1. Multi-touch tracking

Hệ thống ghi lại **toàn bộ hành trình** của user, không chỉ lần cuối:

```
Lần 1 (10:00): Facebook Ads
  → firstTouch = facebook / paid_social / gstar_scholarship
  → Touchpoint 1: { source: facebook, time: 10:00, fbclid: abc123 }

Lần 2 (12:00): Truy cập trực tiếp (không UTM)
  → Không ghi touchpoint mới (không có attribution signal)

Lần 3 (15:00): Google Ads
  → lastTouch = google / cpc / brand_term
  → Touchpoint 2: { source: google, time: 15:00, gclid: xyz789 }

Lần 4 (16:00): Nộp đơn
  → Lưu toàn bộ:
    - firstTouch = facebook
    - lastTouch = google
    - touchpoints = [facebook@10:00, google@15:00]
```

### 5.2. Quy tắc dedup

- Cùng `source + medium + campaign` trong vòng **30 phút** → tính là 1 touchpoint (tránh F5 spam)
- Tối đa **20 touchpoints** — tự động giữ 20 lần gần nhất

### 5.3. Attribution models

| Model | Cách tính |
|---|---|
| **First-touch** | Tín dụng 100% cho kênh đầu tiên |
| **Last-touch** | Tín dụng 100% cho kênh cuối cùng |
| **Linear** | Chia đều cho tất cả touchpoints |
| **Position-based** | 40% first + 40% last + 20% chia giữa |

---

## 6. Xem dữ liệu UTM

### 6.1. Admin Dashboard → Applications

Vào **Dashboard → Applications** → click vào applicant:

- **First touch** — kênh user đến lần đầu tiên
- **Last touch** — kênh user đến lần cuối trước khi nộp đơn
- **Click IDs** — gclid, fbclid, ttclid, msclkid, li_fat_id
- **Landing page** — URL đầu tiên user vào
- **Referrer** — trang dẫn đến website
- **Touchpoint timeline** — toàn bộ hành trình với timestamp

### 6.2. Export CSV

Click **Export CSV** — file Excel bao gồm 13 cột attribution:

| Cột | Mô tả |
|---|---|
| First touch source | Nguồn đầu tiên |
| First touch medium | Kênh đầu tiên |
| First touch campaign | Campaign đầu tiên |
| Last touch source | Nguồn cuối |
| Last touch medium | Kênh cuối |
| Last touch campaign | Campaign cuối |
| GCLID | Google click ID |
| FBCLID | Facebook click ID |
| TTCLID | TikTok click ID |
| MSCLKID | Microsoft click ID |
| LI_FAT_ID | LinkedIn click ID |
| Landing page | URL vào đầu tiên |
| Referrer | Trang dẫn đến |
| Touchpoints | Số lần chạm |

### 6.3. Slack notification (realtime)

Mỗi đơn mới gửi message lên Slack channel:

```
New GStar application · Ocean
Email: ocean@gmail.com
Source: facebook / paid_social
Campaign: gstar_scholarship
Readiness signals: 4 of 5
Scholarship request: yes
Click IDs captured: fbclid
```

### 6.4. Google Sheets (nếu bật sync)

Tự động append row với đầy đủ UTM columns.

---

## 7. Checklist Marketing

### Trước khi chạy campaign

- [ ] Tạo link UTM theo quy chuẩn ở Mục 3
- [ ] Test link: dán vào trình duyệt, kiểm tra `?utm_...` hiển thị trên URL
- [ ] Gắn link vào ads platform (Facebook Ads Manager, Google Ads, etc.)
- [ ] Đảm bảo **Auto-tagging** bật trong Google Ads (cho gclid tự động)
- [ ] Đảm bảo Facebook Ads không xóa UTM (kiểm tra URL parameters trong Ads Manager)
- [ ] Mỗi creative/banner có `utm_content` riêng để so sánh hiệu quả

### Khi đang chạy campaign

- [ ] Đổi `utm_campaign` khi chạy chiến dịch mới
- [ ] **Không đổi** `utm_source`/`utm_medium` giữa chừng → sẽ tạo touchpoint mới
- [ ] Kiểm tra link không bị rút gọn mất UTM (bit.ly có thể xóa params)

### Hàng tuần

- [ ] Vào Admin Dashboard → Applications → Export CSV
- [ ] Lọc theo `Last touch source` để xem kênh nào đang hoạt động
- [ ] Lọc theo `First touch source` để xem kênh nào mang lại awareness
- [ ] Đối chiếu với chi phí quảng cáo để tính CPA
- [ ] So sánh `utm_content` để xem creative nào convert tốt nhất

---

## 8. Lưu ý quan trọng

1. **UTM phải lowercase** — dùng `facebook`, không dùng `Facebook`
2. **Không dùng space** — dùng `_` hoặc `-` thay thế (ví dụ: `gstar_scholarship`)
3. **Click IDs tự động** — không cần gắn thủ công, platform tự thêm
4. **URL có basePath** — tất cả link phải có `/gstar/` ở đầu
5. **User dùng ad-blocker** — hệ thống vẫn capture UTM server-side qua URL params, không bị block
6. **Tối đa 20 touchpoints** — hệ thống tự cap, không cần loại bỏ thủ công
7. **Dedup 30 phút** — nếu user F5 liên tục trong 30 phút, chỉ tính 1 touchpoint
8. **Link rút gọn** — nếu dùng bit.ly/shortlink, đảm bảo UTM params không bị mất
9. **UTM trong email** — luôn gắn UTM cho mọi link trong email, kể cả logo/header
10. **Không reuse campaign name** cho mục đích khác — sẽ gây nhầm lẫn báo cáo

---

## Phụ lục: Template link nhanh

Copy & điền vào chỗ `[...]`:

### Facebook Ads
```
https://summit.newturing.ai/gstar/?utm_source=facebook&utm_medium=paid_social&utm_campaign=[CAMPAIGN]&utm_content=[CREATIVE]
```

### Google Ads
```
https://summit.newturing.ai/gstar/?utm_source=google&utm_medium=cpc&utm_campaign=[CAMPAIGN]&utm_term=[KEYWORD]
```

### LinkedIn Ads
```
https://summit.newturing.ai/gstar/?utm_source=linkedin&utm_medium=paid_social&utm_campaign=[CAMPAIGN]
```

### Email
```
https://summit.newturing.ai/gstar/?utm_source=nti_newsletter&utm_medium=email&utm_campaign=[CAMPAIGN]&utm_content=[BUTTON]
```

### Organic post
```
https://summit.newturing.ai/gstar/?utm_source=[PLATFORM]&utm_medium=organic_social&utm_campaign=[POST_NAME]
```

---

*Tài liệu này được tạo bởi GStar Tech Team · Cập nhật: July 2026*
