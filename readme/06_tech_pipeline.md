# 06 · Tech & Pipeline

## สภาพแวดล้อม
- MacBook M1, RAM 8 GB
- Python 3.9.6 ใน `.venv`
  - ถ้าเจอคำเตือน LibreSSL ไม่ต้องสนใจ รันด้วย `-W ignore` ได้
- Library ที่ใช้: `yt-dlp`, `youtube-comment-downloader`, `pandas`, `numpy`, `scikit-learn 1.6.1`, `networkx 3.2.1`
- Dashboard: HTML ไฟล์เดียว ใช้ d3 7.8.5 จาก cdnjs และฝังข้อมูลไว้ในหน้า

## สคริปต์ (เรียงตามลำดับการรัน)
| สคริปต์ | ทำอะไร | ผลลัพธ์ |
|---|---|---|
| `01_list_episodes.py [--refresh]` | ดึงรายชื่อคลิป แล้วคัดเฉพาะ EP หลักที่ลงวันที่ปี 69 | `data/processed/episodes_2026.csv` |
| `02_scrape_comments.py [--refresh]` | ดึงคอมเม้นและ reply ถ้าหยุดกลางคันรันซ้ำได้ | `data/raw/comments/<video_id>.jsonl`, `data/raw/scrape_log.csv` |
| `02b_scrape_age_restricted.py` | หาคลิปจำกัดอายุ แล้วดึงคอมเม้นแบบล็อกอิน | `data/processed/age_restricted.csv` |
| `06_video_stats.py` | ดึงวิว ไลก์ ความยาว และวันเผยแพร่ | `data/processed/video_stats.csv` |
| `eda.py` | ทำ EDA | `data/processed/eda/*.csv` |
| `segment_k.py` | ทดสอบ K = 2–8 สำหรับ k-means | `eda/k_scores.csv`, `eda/k_profiles.csv` |
| `segments.py` | โมดูล k-means K = 3 (ไฟล์อื่นเรียกใช้) | `data/processed/loyalty_kmeans.json` |
| `07_subtopics.py` | วิเคราะห์ประเด็นย่อย ซีรีส์ และ Engagement | `subtopic_summary.csv`, `category_subtopic.csv`, `ep_engagement.csv`, `series_summary.csv` |
| `08_ground_truth.py` → `more` → `build` | Gen ขั้น 1: regex รอบ 1 และรอบ 2 หาคนที่บอกอายุตัวเอง สร้างไฟล์ให้ Claude ตรวจ แล้วรวมเป็นเฉลยรายคน (รอบ 1 และ 2 รันซ้ำไม่ได้ มีตัวกันไว้) | `data/labels/ground_truth/candidates.csv`, `review_NNN.txt`, `review2_NNN.txt`, `verified.txt`, `ground_truth.csv` |
| `09_blind_test.py make` / `score` | Gen ขั้น 4: สร้างชุดทดสอบจากชุดเฉลย ซ่อนทุกประโยคที่ regex จับได้ ให้ Claude เดา แล้วให้คะแนน | `data/labels/todo/blind_test.txt`, `ground_truth/blind_key.csv`, `ground_truth/confusion_matrix.csv`, `ground_truth/blind_score.txt` |
| `10_gen_model.py` | Gen ขั้น 5: สอนโมเดล char n-gram TF-IDF + Logistic Regression จากป้ายของ Claude วัดกับชุดเฉลย แล้วทายทุกคน (~5 นาที) | `data/processed/gen_proba.csv.gz`, `eda/gen_model_report.txt` |
| `11_gen_estimates.py` | Gen ขั้น 6: ตัวเลขสุดท้ายแบบผสม พร้อม bootstrap (~40 วินาที) | `gen_by_segment.csv`, `gen_by_category.csv`, `gen_by_tag.csv`, `gen_by_ep.csv`, `gen_estimates.json` |
| `12_communities.py [K]` | สายคนดู: ความสนใจรายคนที่หักผลของสิ่งที่ออกอากาศ + k-means (ไม่ใส่ K = ดูคะแนน K = 2–8 อย่างเดียว ใส่ 4 = ใช้จริง) | `communities.json`, `community_profiles.csv`, `community_lift.csv`, `eda/community_k_scores.csv`, `person_community.csv.gz` (เก็บในเครื่องเท่านั้น) |
| `13_descriptions.py` | ดึงคำอธิบายคลิปทุก EP เพื่อหาสปอนเซอร์ (รันซ้ำได้ ข้าม EP ที่ดึงแล้ว) | `data/raw/descriptions.jsonl` |
| `14_brand_mentions.py` | นับคอมเม้นที่พูดถึงแบรนด์ (คำสะกดหลายแบบ กันคำที่จับผิด เช่น "ฮาชิบหาย" และ "นิสิต" ที่แปลว่านักศึกษา) แยกตาม EP ความภักดี และสาย | `brand_mentions.csv`, `brand_by_segment.csv`, `brand_examples.txt` (เก็บในเครื่องเท่านั้น) |
| `15_pilot_setup.py randomize` / `ep` | ชุด Pilot: สุ่ม EP ที่มีโฆษณา (บล็อกละ 3, seed 2026) และคำนวณตัวเลขราย EP ให้วางในชีต Pilot | `data/pilot/slots.csv`, `data/pilot/ep_metrics.csv` |
| `16_transcripts.py [--slow]` | ดึงคำบรรยายอัตโนมัติภาษาไทยทุก EP (รันซ้ำได้ ข้ามที่มีแล้ว) · `--slow` เว้น 45–75 วินาทีต่อ EP ถ้าโดนบล็อกพัก 30 นาทีแล้วลองใหม่ สูงสุด 8 รอบ | `data/raw/transcripts/*.json`, `_log.csv` (เก็บในเครื่องเท่านั้น) |
| `17_transcript_brands.py` | ค้นชื่อแบรนด์ในคำพูด (รูปแบบเดียวกับ `14`) รวมการพูดซ้ำภายใน 60 วินาทีเป็นครั้งเดียว | `onair_brand_log.csv`, `onair_brand_summary.csv`, `onair_brand_examples.txt` (เก็บในเครื่องเท่านั้น) |
| `18_build_backoffice.py` | เตรียมข้อมูลหน้าหลังบ้านทีมการตลาด จาก `web_src/data.json` + CSV ยอดรวม (ต้องรัน `03_analyze.py` ก่อน) และคัดลอกปกวิดีโอไปไว้ให้เว็บ · หน้าเว็บเป็นโปรเจกต์ React + TypeScript ใน `web/` แก้หน้าที่ `web/src/` | `web/src/data/backoffice.json` (ยอดรวมเท่านั้น), `web/public/thumbs/*.jpg` |
| `19_thumbnails.py` | ดึงปกวิดีโอ YouTube ทุก EP ย่อด้วย `sips` ให้ `18_build_backoffice.py` คัดลอกไปที่ `web/public/thumbs/` (รันก่อน 18) | `data/processed/thumbs/*.jpg` |
| `20_unique_reach.py` | คนไม่ซ้ำและความถี่ของแพ็กเกจ: เส้นคนไม่ซ้ำรายหมวด + Sainsbury + ปรับเทียบด้วยการจำลอง (~20 วินาที รันก่อน 18) | `data/processed/unique_reach.json` |
| `21_category_kappa.py` | ตรวจหมวด EP: Claude จัดใหม่แบบไม่เห็นคำตอบ เทียบกับคน (39 EP) และกับ Claude รอบแรก (ชุดสุ่ม) รายงาน % ตรงกัน Wilson CI และ Cohen's kappa | `eda/category_kappa.txt` |
| `24_category_centrality.py` | Centrality ของกราฟหมวด ↔ หมวด (strength, betweenness, cross strength) จาก `web_src/data.json` (ต้องรัน `03_analyze.py` ก่อน) | `data/processed/category_centrality.csv` |
| `03_analyze.py` | รวมทุกอย่าง: คน → Gen + ความภักดี → สรุปรายหมวดและราย EP → Network | `users.csv.gz`, `category_summary.csv`, `ep_summary.csv`, `web_src/data.json` |
| `04_make_sample.py [N_PER]` | Gen ขั้น 2: สุ่มแบบแบ่งชั้นตาม K = 3 กลุ่มละ 1,500 คน ไม่เอาคนในชุดเฉลย แบ่งชุดละ 150 คน ให้ Claude อ่าน | `data/labels/sample.csv`, `data/labels/todo/batch_NNN.txt` แล้ว Claude ตอบที่ `data/labels/done/batch_NNN.csv` |
| `05_build_dashboard.py` | Dashboard ชุดแรก (เลิกใช้บนเว็บแล้ว) ฝังข้อมูลลงแม่แบบ `web_src/dashboard_template.html` | `web_src/old/site_index.html` (เปิดดูในเครื่อง) |
| `gen_rules.py` | กฎคีย์เวิร์ด Gen สำรอง (อ่านออกราว 3%) | – |

## วิธีรัน
```bash
cd ~/Desktop/ReachRadar
caffeinate -i .venv/bin/python -W ignore scripts/02_scrape_comments.py   # ทิ้งไว้ข้ามคืนได้
.venv/bin/python -W ignore scripts/06_video_stats.py
.venv/bin/python -W ignore scripts/eda.py
.venv/bin/python -W ignore scripts/07_subtopics.py
.venv/bin/python -W ignore scripts/03_analyze.py        # รอบแรก: สร้าง users.csv.gz
.venv/bin/python -W ignore scripts/10_gen_model.py      # โมเดล Gen (~5 นาที)
.venv/bin/python -W ignore scripts/11_gen_estimates.py  # ตัวเลข Gen แบบผสม
.venv/bin/python -W ignore scripts/03_analyze.py        # รอบสอง: รวม Gen เข้า web_src/data.json
.venv/bin/python -W ignore scripts/18_build_backoffice.py  # ข้อมูลหน้าหลังบ้าน
cd web && npm install && npm run dev                     # ดูหน้าเว็บในเครื่อง (npm run build = สร้างไฟล์ไป web/dist/)
```

## ดึงคลิปจำกัดอายุ (เมื่อจำเป็น)
```bash
mkdir -p data/secrets && chmod 700 data/secrets
.venv/bin/yt-dlp --cookies-from-browser chrome --cookies data/secrets/yt_cookies.txt \
  --skip-download --print title "https://www.youtube.com/watch?v=<id จำกัดอายุ>"
.venv/bin/python -W ignore scripts/02b_scrape_age_restricted.py
rm -P data/secrets/yt_cookies.txt   # ลบทิ้งทันทีหลังใช้
```
ขั้นแรก macOS จะขอสิทธิ์ Keychain "Chrome Safe Storage" ให้กด Allow

## โครงสร้างโฟลเดอร์
```
ReachRadar/
├── readme/            เอกสารชุดนี้
├── scripts/           สคริปต์ทั้งหมด
├── data/
│   ├── raw/           คอมเม้นดิบ (มีชื่อบัญชีจริง ห้ามเผยแพร่) + log
│   ├── processed/     ตารางสรุป, แท็ก, eda/
│   ├── labels/        ป้าย Gen ที่ Claude อ่าน (todo/, done/)
│   └── secrets/       cookie ชั่วคราว (ต้องว่างเสมอ)
├── web_src/           data.json (จาก 03), dashboard_template.html, old/ (หน้าเก่าแบบไฟล์เดียว)
└── web/               โปรเจกต์ React + TypeScript (Vite) ของหน้าหลังบ้าน = โฟลเดอร์ที่ deploy
    ├── src/           App.tsx, pages/ (หน้าละไฟล์), planner/ (วางแผนแคมเปญ + PDF), components/, lib/, data/backoffice.json
    └── public/thumbs/ ปกวิดีโอ
```

## Hosting (ฟรี)
- ตอนนี้: หน้าหลังบ้านเป็นโปรเจกต์ React 18 + TypeScript + Vite ใน `web/` · ดูในเครื่องด้วย `npm run dev` จากในโฟลเดอร์ `web/` · Export PDF ใช้ html2canvas + jsPDF ดาวน์โหลดไฟล์ได้ตรงๆ
- **หน้าซ่อน `#models`** (`web/src/journey/Models.tsx`): หน้าแรก `#models` คือหน้าปก (title card) ต่อด้วยหน้าแขกรับเชิญ `#models/guests` (ภาพ key visual ของทีม) แล้ว "ทำไมต้องใช้ Network" `#models/why` (ตารางเทียบกราฟ) ต่อด้วยภาพรวม Process `#models/overview` (5 ขั้น 13 เรื่อง กดไปแต่ละเรื่องได้) แล้ว 1 หน้าต่อ 1 ขั้น รวม 16 หน้า (`#models/1` ถึง `#models/16`) แต่ละหน้ามีภาพ Input ใหญ่ → กล่องโมเดล (ชื่อโมเดล + กราฟย่อยถ้ามี) → ภาพ Output ใหญ่ ภาพค่อยๆ วาดขึ้นตามลำดับ Input → โมเดล → Output · ทุกภาพวาดจากยอดรวมจริงใน `backoffice.json` และ `journey/data.ts` ยกเว้น 2 ภาพที่ติดป้ายว่าเป็นภาพประกอบ (กราฟแท็กรอบแรก กับเส้นคน–หมวดในกราฟสองฝั่ง) · ขั้นวางแผนแคมเปญคำนวณสดด้วย `planNumbers(PLAN0)` ตัวเดียวกับเครื่องมือจริง · เปลี่ยนหน้าด้วยปุ่ม แถบจุด หรือลูกศรซ้าย–ขวา · ชื่อเทคนิคอ้างเฉพาะลิสต์ 34 เทคนิคของวิชา (ป้ายมุมขวาบน) และมีบรรทัด "ที่ทำจริง" เมื่อวิธีจริงต่างจากชื่อในลิสต์
- **หน้าซ่อน `#journey`** (`web/src/journey/`): เล่าประวัติการทำงานเป็นภาพเคลื่อนไหว 12 ขั้น ไม่มีลิงก์จากเมนู เข้าได้เฉพาะพิมพ์ `/#journey` ต่อท้าย URL · โหลดแยกไฟล์ (lazy) คนเปิดหลังบ้านปกติไม่ต้องโหลด · ใช้ข้อมูลจาก `backoffice.json` เดิม บวกยอดรวม 2 ชุดที่ฝังใน `journey/data.ts` (การกระจายจำนวน EP ต่อคนจาก `eda/n_eps_distribution.csv` และ Jaccard หมวด ↔ หมวดจาก `web_src/data.json`) · ตารางคอมเม้นดิบในขั้นที่ 2 เป็นรูปแบบข้อมูลที่ปิดข้อความและชื่อบัญชีไว้
- เผยแพร่เป็นพอร์ต (deploy แล้ว 28 พ.ย. 2569 ผูกกับ GitHub `main` push แล้ว build ใหม่เอง): **Vercel แผน Hobby** (ฟรี ใช้ได้กับงานที่ไม่ใช่เชิงพาณิชย์)
  - เว็บเป็น static site ไม่มี backend ข้อมูลยอดรวมรวมอยู่ในไฟล์ JS ตอน build
  - ตั้ง Root Directory = `web` และ Framework = Vite (Vercel ตรวจเจอเอง: build `npm run build`, output `dist`) หรือรัน `vercel --prod` จากในโฟลเดอร์ `web/`
  - URL ที่จะได้: `/` (หน้าหลังบ้าน) หน้าเดียว เปิดเป็นสาธารณะ
  - ข้อมูลเปลี่ยนเมื่อไหร่ ต้องรันสคริปต์ 18 ในเครื่องก่อน (อัปเดต `web/src/data/` และ `web/public/thumbs/`) แล้วค่อย deploy ใหม่
- GitHub repo: **https://github.com/aom-thanya/reachradar** (public, push ครั้งแรก 28 พ.ย. 2569) เก็บ `scripts/`, `readme/`, `web/`, `web_src/`, `README.md`, `CLAUDE.md` · `.gitignore` ที่ราก repo กัน `/data/` (มี `/` นำหน้า เพื่อไม่ให้กัน `web/src/data/` ไปด้วย), `.venv/`, `.venv-ytdlp/`, `web/node_modules/`, `web/dist/`
- `data/` ทั้งหมดไม่ขึ้น Vercel ส่วนการแยกไฟล์ที่เผยแพร่ได้ดูหัวข้อ "การเผยแพร่ข้อมูล" ใน [07_limitations_privacy.md](07_limitations_privacy.md)
- Dashboard มีแค่ตัวเลขสรุป ไม่มีชื่อบัญชีหรือข้อความคอมเม้น
