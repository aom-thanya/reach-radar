# 10 · Rubric Capstone (MADT7202)

เกณฑ์ให้คะแนนงานกลุ่ม Capstone ของวิชา **MADT 7202 Web and Social Network Analytics Management** คัดจาก Course Syllabus ปี 2569 ใช้เป็นตัวตั้งตรวจว่างาน ReachRadar ได้คะแนนเต็มหรือยัง

## ข้อมูลงาน

| หัวข้อ | รายละเอียด |
|---|---|
| ประเภท | **งานกลุ่ม** (ต่างจาก Mid-term applied case สัปดาห์ 8 ที่เป็นงานเดี่ยว) |
| น้ำหนัก | 40 คะแนน จากคะแนนเต็มวิชา 100 (ก้อนใหญ่ที่สุดของวิชา) |
| ส่ง | สัปดาห์ที่ 11 (Project Presentation) |
| สิ่งที่ต้องส่ง | Final deck + short written brief |
| โครงเรื่องที่วิชาคาดหวัง | Problem → Data → Graph → Analysis → Decision |
| การให้คะแนน | 5 เกณฑ์ เกณฑ์ละ 1–5 คะแนน รวมเต็ม 25 (Syllabus ไม่ได้ระบุว่าแปลงเป็น 40 คะแนนอย่างไร) |

## Rubric ฉบับเต็ม (ภาษาอังกฤษตามต้นฉบับ)

| เกณฑ์ | 5 points | 4 points | 3 points | 2 points | 1 point |
|---|---|---|---|---|---|
| **Problem Framing & Business Relevance** | Sharp reframe with Actors → Ties → Structure at the right level (node / group / network); the network view clearly changes the question. | Clear network reframe tied to a real decision, with minor gaps. | Adequate reframe; the decision is stated but loosely connected. | Weak or generic framing; unclear why a network view helps. | No meaningful reframe; treats the problem as rows. |
| **Data Collection & Graph Construction** | Data collected responsibly (PDPA / ToS respected); text → graph pipeline with sound entity resolution and justified edge weighting; validated quality. | Good, compliant collection and a solid graph with minor quality issues. | Adequate graph; some compliance or quality gaps. | Questionable compliance or a weak / unvalidated graph. | Non-compliant collection or an unusable graph. |
| **Network Analysis & Analytical Rigor** | Selects the right measures (centrality, structure, community, diffusion) for the question and interprets them correctly and insightfully. | Appropriate measures with mostly correct interpretation. | Basic analysis; interpretation partly correct. | Limited or partly incorrect analysis. | Poor or missing analysis. |
| **Technology & AI Integration** | Uses graph technology (graph DB / GraphRAG / causal KG) where it genuinely fits and critically documents where AI helped vs. where human judgment was decisive. | Good use of technology and a clear AI-vs-human reflection. | Adequate technology use; reflection is basic. | Superficial or forced technology use; little critique of AI. | No appropriate technology use, or uncritical reliance on AI. |
| **Business Impact & Responsible Use** | Clear, defensible recommendation with quantified impact; addresses ethics / PDPA; communicates to a business audience excellently. | Clear recommendation with good impact and responsible-use discussion. | Adequate recommendation; impact or ethics lightly treated. | Weak recommendation; little impact or ethics reasoning. | No clear recommendation, or ignores responsible use. |

## เงื่อนไขของ 5 คะแนน แตกเป็นข้อตรวจ

แตกคำในช่อง 5 points ออกเป็นข้อย่อย เพื่อเช็กทีละข้อว่ามีหลักฐานในงานหรือยัง ช่อง "หลักฐานใน ReachRadar" กับ "สถานะ" เว้นว่างไว้ให้กรอกตอน validate

### 1. Problem Framing & Business Relevance

| # | ต้องมี | หลักฐานใน ReachRadar | สถานะ |
|---|---|---|---|
| 1.1 | Reframe ปัญหาธุรกิจเป็นเครือข่าย ระบุครบ Actors → Ties → Structure | | |
| 1.2 | เลือกระดับการวิเคราะห์ถูก (node / group / network) และบอกเหตุผล | | |
| 1.3 | มุมมองเครือข่ายเปลี่ยนคำถามจริง ไม่ใช่วิเคราะห์แบบแถวในตารางแล้ววาดกราฟประกอบ | | |
| 1.4 | ผูกกับการตัดสินใจทางธุรกิจที่มีอยู่จริง | | |

### 2. Data Collection & Graph Construction

| # | ต้องมี | หลักฐานใน ReachRadar | สถานะ |
|---|---|---|---|
| 2.1 | เก็บข้อมูลอย่างรับผิดชอบ เคารพ PDPA และ ToS ของแพลตฟอร์ม | | |
| 2.2 | มี pipeline จากข้อความ → กราฟ | | |
| 2.3 | Entity resolution / dedup ที่สมเหตุสมผล | | |
| 2.4 | การให้น้ำหนักเส้น (edge weighting) มีเหตุผลรองรับ | | |
| 2.5 | ตรวจคุณภาพแล้ว (validated) เช่น validation sample | | |

### 3. Network Analysis & Analytical Rigor

| # | ต้องมี | หลักฐานใน ReachRadar | สถานะ |
|---|---|---|---|
| 3.1 | เลือกตัวชี้วัดที่ตรงคำถาม จากกลุ่ม centrality / structure / community / diffusion | | |
| 3.2 | ตีความผลถูกต้อง | | |
| 3.3 | ตีความแล้วได้ insight ไม่ใช่แค่รายงานตัวเลข | | |

### 4. Technology & AI Integration

| # | ต้องมี | หลักฐานใน ReachRadar | สถานะ |
|---|---|---|---|
| 4.1 | ใช้เทคโนโลยีกราฟ (graph DB / GraphRAG / causal KG) อย่างน้อยหนึ่งอย่าง | | |
| 4.2 | เทคโนโลยีนั้นเหมาะกับโจทย์จริง ไม่ได้ยัดเข้ามาเพื่อให้ครบ | | |
| 4.3 | บันทึกอย่างมีวิจารณญาณว่าตรงไหน AI ช่วย | | |
| 4.4 | บันทึกว่าตรงไหนคนเป็นผู้ตัดสินใจชี้ขาด | | |

### 5. Business Impact & Responsible Use

| # | ต้องมี | หลักฐานใน ReachRadar | สถานะ |
|---|---|---|---|
| 5.1 | ข้อเสนอแนะชัดเจนและป้องกันได้ (defensible) | | |
| 5.2 | ประเมินผลกระทบเป็นตัวเลข (quantified impact) | | |
| 5.3 | พูดถึงจริยธรรม / PDPA | | |
| 5.4 | สื่อสารกับคนฝั่งธุรกิจได้ดีมาก (deck + brief) | | |

## ที่มา

Course Syllabus MADT7202 ปีการศึกษา 2569 หน้า 2–3 (Grading Policy, Calendar สัปดาห์ 11 และ Rubric for the Capstone Project)
