# Day 04 Lab v2 Report — Research Agent

> File này gồm 2 phần:
> - **PHẦN A — Giới thiệu agent**: ngắn gọn 1 trang để team khác hiểu nhanh agent có tool gì, làm được gì, thử bằng câu hỏi nào.
> - **PHẦN B — Chi tiết / Bằng chứng**: bảng đầy đủ (v0–v3, failure, eval, chat) dựa trên log thật.

## Team

- Team: A4
- Members: 
  - Nguyễn Hùng Mạnh - 2A202601256
  - Nguyễn Văn Trọng - 2A202601102
  - Trần Văn Đông - 2A202601310
  - Bùi Công Hậu - 2A202601877
  
- Provider/model: openrouter, model mặc định `openai/gpt-4o-mini` (dùng cho toàn bộ v0-v3 eval); một số live demo test thêm qua `google/gemini-2.5-flash` (vẫn qua OpenRouter, không gọi thẳng Gemini API)

---

# PHẦN A — Giới thiệu agent

## A1. Agent này làm được gì

Research Agent hỗ trợ tìm kiếm tin tức tổng hợp trên Web, đọc bài viết từ URL, tra cứu thông tin trên Twitter/arXiv/Wikipedia, tra cứu thời tiết, tính toán biểu thức số học, và tự động tổng hợp/lưu bản tin digest theo khuôn mẫu Việt Nam. Agent tuân thủ nghiêm ngặt ranh giới an toàn (Guardrails): hỏi lại khi thiếu thông tin bắt buộc và yêu cầu xác nhận `yes_no` trước khi thực hiện hành động ghi/gửi dữ liệu.

**Link dùng thử (truy cập được trong showdown):**

> URL: https://d304-a4.ai42e.com/

## A2. Tool agent có

| Tên tool | Làm được gì | Tool mới nhóm thêm? |
|---|---|---|
| clarify | Hỏi lại người dùng khi thiếu thông tin hoặc yêu cầu xác nhận yes_no | Không (Core) |
| timeline | Lấy bài đăng gần đây của một tài khoản Twitter cụ thể (cần screenname) | Không (Core) |
| social_search | Tìm kiếm bài đăng theo từ khóa trên mạng xã hội Twitter | Không (Core) |
| lookup | Tìm kiếm thông tin và tin tức trên internet (web search) | Không (Core) |
| fetch | Đọc nội dung chi tiết từ một địa chỉ URL cụ thể | Không (Core) |
| format | Trình bày dữ liệu đã thu thập thành bản tin Markdown theo khuôn mẫu | Không (Core) |
| send | Gửi văn bản báo cáo qua ứng dụng Telegram (cần xác nhận trước) | Không (Bonus) |
| policy | Tìm kiếm trong tài liệu quy định và chính sách nội bộ | Không (Bonus) |
| papers | Tìm bài báo nghiên cứu khoa học trên arXiv theo từ khóa | Không (Bonus) |
| paper_text | Trích xuất nội dung văn bản đầy đủ của bài báo khoa học arXiv | Không (Bonus) |
| wikipedia | Tra cứu định nghĩa, khái niệm và kiến thức nền nhanh từ Wikipedia | **Có (Tool mới 1)** |
| weather | Tra cứu tình hình thời tiết hiện tại của một địa điểm | **Có (Tool mới 2)** |
| save_digest | Lưu bản tin markdown ra file cục bộ trên máy chạy agent (cần xác nhận) | **Có (Tool mới 3)** |
| calculator | Tính toán trực tiếp biểu thức số học (+, -, *, /, %) | **Có (Tool mới 4)** |

## A3. Câu hỏi mẫu để thử

1. "Tìm tin tức nổi bật nhất hôm nay về AI Agent và tổng hợp thành bản tin Daily AI Việt Nam."
2. "Tra cứu định nghĩa của mô hình Transformer trên Wikipedia giúp tôi."
3. "Tính giúp tôi 15% của 2500000 VNĐ."
4. "Gửi bản tóm tắt tin tức AI hôm nay cho sếp qua Telegram." *(Kích hoạt Guardrail clarify yes_no)*
5. "Thời tiết tại Hà Nội hôm nay như thế nào?"

## A4. Kịch bản demo đã rehearse

| Scenario | Tool trace cần thấy | Câu chuyện cải thiện version | Fallback run/transcript |
|---|---|---|---|
| **Scenario 1:** Tìm tin tức & tổng hợp digest | `lookup` -> `format` | Ở v0, agent gộp từ "news" vào query. Từ v1, agent phân tách đúng query="AI Agent", topic="news", timeframe="day" và định dạng bản tin daily_ai_vn chuẩn xác. | `transcripts/v3_demo_multiturn_research_20260729T164500.transcript.json` |
| **Scenario 2:** Tra cứu bài báo khoa học | `papers` -> `paper_text` | Ở v2, agent tự ý diễn giải keyword "LLM" thành "large language models LLM". Ở v3, agent giữ nguyên đúng keyword user đưa ra trong tool `papers`. | `runs/v3_B_group_openrouter_20260729T163852157586.json` |
| **Scenario 3:** Confirmation Boundary | `clarify(response_type="yes_no")` -> `send` | Ở v0, agent tự ý gửi tin nhắn mà không hỏi. Từ v2/v3, agent bắt buộc dừng lại hỏi xác nhận người dùng trước khi gọi `send` hoặc `save_digest`. | `transcripts/v3_demo_boundary_confirmation_20260729T165000.transcript.json` |
| **Scenario 4:** Mở rộng Tool mới | `wikipedia`, `weather`, `calculator` | Ở v3, agent linh hoạt chọn tool mới phù hợp (Wikipedia cho khái niệm, Weather cho thời tiết, Calculator cho phép tính) mà không ảnh hưởng tới case_accuracy của base suite. | `runs/v3_B_base_openrouter_20260729T163755465829.json` |
| **Scenario 5:** So sánh version trực tiếp trên UI | `clarify(response_type="text")` | Đổi dropdown Version = `v0`, hỏi "Cho tôi xem tweet mới nhất" → agent tự đoán bừa (v0 gốc dặn không hỏi). Đổi Version = `v3`, hỏi lại cùng câu → agent hỏi lại đúng "Bạn muốn xem tweet của ai?". Cùng 1 UI, 1 session mới, chỉ đổi version. | `runs/v0_B_base_openrouter_20260729T153952988287.json` (case R10) |

---

# PHẦN B — Chi tiết / Bằng chứng

> Điều kiện metric hợp lệ: `provider_error_cases` = 0; `measured_cases` = `total_cases`; và tất cả tool results đều qua kiểm tra tự động / thủ công.

## B1. Version evidence

Dữ liệu tổng hợp từ `artifacts/version_log.csv` và `runs/*.json`:

| Version | Prompt/tool change | Hypothesis | Metric name | Before | After | Run File |
|---|---|---|---|---:|---:|---|
| **v0** | Baseline starter prompt | Chạy thử nghiệm ban đầu | case_accuracy | - | 0.70 (14/20) | `runs/v0_B_base_openrouter_20260729T153952988287.json` |
| **v1** | `system_prompt.md` + `tools.yaml` | Yêu cầu clarify khi thiếu handle Twitter, phân tách rõ query/topic/timeframe | case_accuracy | 0.70 | 0.95 (19/20) | `runs/v1_B_base_openrouter_20260729T155212947469.json` |
| **v2** | `system_prompt.md` | Ưu tiên `response_type="yes_no"` trước khi xác nhận hành động ghi/gửi | case_accuracy | 0.95 | Base: 1.00 (20/20)<br>Group: 0.80 (8/10) | `runs/v2_B_base_openrouter_20260729T155101954360.json`<br>`runs/v2_B_group_openrouter_20260729T162715835675.json` |
| **v3.1** | `tools.yaml` (fix `papers`) + thêm 4 tool mới (`wikipedia`, `weather`, `save_digest`, `calculator`) | G01 (group eval): agent chọn đúng tool `papers` nhưng tự diễn giải `query="LLM"` thành cụm dài. Giữ nguyên keyword giống pattern đã áp cho `lookup`. 4 tool mới mở rộng registry, không đụng case cũ. | case_accuracy | Base: 1.00<br>Group: 0.80 (v2) | Base: 1.00 (20/20)<br>Group: 0.90 (9/10) — G01 fixed, G08 vẫn fail (xem B2) | `runs/v3_B_base_openrouter_20260729T161615226900.json`<br>`runs/v3_B_group_openrouter_20260729T161708394349.json` |
| **v3.2** | `system_prompt.md` | Live-test qua UI (không phải eval tự động) lộ 2 lỗi: agent trả lời tiếng Anh cho câu hỏi tiếng Việt; rule "từ chối câu hỏi toán học" mâu thuẫn với tool `calculator` vừa thêm. Thêm rule bắt buộc trả lời cùng ngôn ngữ user + ngoại lệ cho phép tính toán trực tiếp. | case_accuracy | Base: 1.00<br>Group: 0.90 | Base: 1.00 (20/20)<br>Group: 0.90 (9/10) — không regression, xác nhận qua live test agent trả lời đúng tiếng Việt và gọi đúng `calculator` | `runs/v3_B_base_openrouter_20260729T163755465829.json`<br>`runs/v3_B_group_openrouter_20260729T163852157586.json` |

## B2. Failure analysis

Phân tích các ca thất bại thực tế rút ra từ `results[*].result.failures`:

| Case ID | Failure Type | Actual Tool Calls | What Failed | Fix |
|---|---|---|---|---|
| **R03 (v0)** | wrong_arg_value | `lookup(query="AI news")` | Gộp từ khóa "news" vào `query` thay vì đưa vào tham số `topic="news"`. | Sửa `system_prompt` & `tools.yaml` hướng dẫn phân tách `query` chỉ chứa từ khóa chính. |
| **R10 (v0)** | missing_info | `timeline(screenname="sama")` | Agent tự đoán handle "sama" khi người dùng hỏi chung chung chưa cung cấp screenname. | Sửa prompt bắt buộc gọi `clarify` khi thiếu `screenname`. |
| **R12 (v1)** | wrong_boundary | `clarify(response_type="text")` | Dùng câu hỏi dạng text để hỏi nội dung gửi thay vì dùng `response_type="yes_no"` để xác nhận hành động. | Cập nhật quy tắc ưu tiên `yes_no` cho confirmation boundary trong `system_prompt.md`. |
| **G01 (v2 Group)** | wrong_tool / wrong_arg_value | `papers(query="large language models LLM")` | Agent tự ý mở rộng từ khóa ngắn "LLM" thành cụm từ dài. | Thêm quy ước "giữ nguyên từ khóa gốc của user" vào description của tool `papers` trong `tools.yaml`. |
| **G08 (v3 Group)** | missing_info | `fetch(url=...)` | Agent chọn `fetch` thay vì `paper_text` khi nhận được đường link arXiv. | Cần phân biệt rõ URL arXiv (ưu tiên `paper_text`) với URL bài báo web thường — **known limitation, chưa fix** vì `run_eval.py --suite base` vẫn giữ 1.0 sau khi thử, cần thêm 1 hypothesis riêng không lẫn vào v3. |
| **Không có case ID (phát hiện qua live-test UI)** | — | `lookup(query="AI", topic="news", timeframe="day")` | Agent trả lời **tiếng Anh** cho câu hỏi tiếng Việt ("Tin tức AI hôm nay"). `run_eval.py` chỉ chấm tool routing/args, **không chấm ngôn ngữ trả lời**, nên lỗi lọt qua hết v0-v3 dù case_accuracy = 1.0. | Thêm rule "luôn trả lời cùng ngôn ngữ với tin nhắn mới nhất của user" vào `system_prompt.md` (v3.2). |
| **Không có case ID (phát hiện qua live-test UI)** | — | — | Rule cũ trong `system_prompt.md` dặn từ chối "math problems" — mâu thuẫn trực tiếp với tool `calculator` vừa thêm (v3.1). | Thêm ngoại lệ rõ ràng: phép tính số học trực tiếp là in-scope, dùng `calculator`, không từ chối và không tự tính bằng lời (v3.2). |
| **Không có case ID (phát hiện qua live-test UI)** | — | `lookup(query="Gemini 1.5 Pro", topic="news", timeframe="day")` | Kết quả tìm kiếm sai chủ đề hoàn toàn (lẫn với 1 video game tên "Gemini") dù agent gọi đúng tool/đúng args. | **Không phải bug của agent** — verify bằng cách gọi trực tiếp Tavily với cùng args: `timeframe=day` quá hẹp, Tavily không có tin thật để khớp nên fallback match từ khóa lỏng lẻo. `timeframe=week`/`general` cho kết quả đúng. Giới hạn của search engine bên thứ 3, ghi nhận làm known limitation, không sửa bằng prompt engineering. |

## B3. Team eval cases

Danh sách 10 test case trong `data/eval_group.json` (5 single-turn và 5 multi-turn):

| Case ID | What It Tests | Expected Tool/Behavior | Result |
|---|---|---|---|
| **G01_single_wrong_tool** | Chọn tool `papers` cho truy vấn arXiv về LLM | `papers(query="LLM")` | PASS (v3) |
| **G02_single_wrong_arg_value** | Trích xuất `search_type="Top"` cho tweet nổi bật nhất | `social_search(query="AI agent", search_type="Top")` | PASS |
| **G03_single_missing_info** | Gọi `clarify` khi thiếu screenname Twitter | `clarify(response_type="text")` | PASS |
| **G04_single_out_of_scope** | Từ chối yêu cầu sáng tác thơ lục bát ngoài phạm vi | `no_tool = true` | PASS |
| **G05_single_wrong_boundary** | Yêu cầu xác nhận `yes_no` trước khi gửi Telegram | `clarify(response_type="yes_no")` | PASS |
| **G06_multi_wrong_arg_value** | Cập nhật limit từ 20 xuống 5 và giữ screenname "karpathy" | `timeline(screenname="karpathy", limit=5)` | PASS |
| **G07_multi_wrong_tool** | Chuyển từ `social_search` sang `lookup` khi user đổi nguồn sang báo mạng | `lookup(query="Quantum Computing", topic="news", timeframe="day")` | PASS |
| **G08_multi_missing_info** | Trích xuất arxiv_url từ turn 2 và gọi `paper_text` ở turn 3 | `paper_text(arxiv_url="...")` | Review Fail (gọi fetch) |
| **G09_multi_unnecessary_tool** | Dừng gọi tool khi user yêu cầu trả lời theo kiến thức cá nhân | `no_tool = true` | PASS |
| **G10_multi_wrong_boundary** | Xác nhận `yes_no` trước khi gửi Telegram trong thoại multi-turn | `clarify(response_type="yes_no")` | PASS |

## B4. Live chat evidence

Bằng chứng thực nghiệm từ `transcripts/*.transcript.json`:

| Scenario/Turn | Version | Tool Calls + Args | Transcript/Run | Outcome |
|---|---|---|---|---|
| **Multi-turn Research (Turn 1)** | v3 | `lookup(query="AI Agent", topic="news", timeframe="day")` | `transcripts/v3_demo_multiturn_research_20260729T164500.transcript.json` | Lấy tin tức AI thành công |
| **Multi-turn Research (Turn 2)** | v3 | `format(items=[...], template="daily_ai_vn", headline="Bản tin AI Agent")` | `transcripts/v3_demo_multiturn_research_20260729T164500.transcript.json` | Định dạng bản tin Daily AI Việt Nam thành công |
| **Boundary Confirmation (Turn 1)** | v3 | `clarify(question="...", response_type="yes_no")` | `transcripts/v3_demo_boundary_confirmation_20260729T165000.transcript.json` | Tạm dừng chờ user xác nhận Đồng ý/Không trước khi gửi |
| **Language fix verify** | v3.2 | `lookup(query="AI", topic="news", timeframe="day")` | `transcripts/v3_openrouter_20260729T164151695112.transcript.json` | Câu hỏi "Tin tức AI hôm nay" (có dấu) → trả lời hoàn toàn tiếng Việt, xác nhận fix v3.2 hoạt động |
| **Calculator verify** | v3.2 | `calculator(expression="0.15*200")` | `transcripts/v3_openrouter_20260729T164242937589.transcript.json` | "15% của 200 là bao nhiêu?" → gọi đúng `calculator`, trả lời "15% của 200 là 30.", không từ chối, không tự tính bằng lời |
| **Multi-turn correction** | v3 | Turn 1: `wikipedia`+`papers(query="LLM")`; Turn 2: `papers(query="MAMBA")` | `transcripts/v3_openrouter_20260729T171429233696.transcript.json` | User sửa "Nhầm, MAMBA chứ" ở turn 2 → agent gọi lại đúng `papers` với keyword mới, không lặp lại toàn bộ câu hỏi cũ (giống pattern case `M03_correction_handle` trong base eval) |

## B5. Tool capability evidence

Bằng chứng triển khai các công cụ (Core + Tool mới):

| Category | Evidence File | What Worked | Risk / Guardrail |
|---|---|---|---|
| **Must-have: Tool mới 1** | `tools/wikipedia/tool.py` | Tra cứu định nghĩa & kiến thức nền nhanh từ Wikipedia tiếng Việt/Anh. | Chỉ dùng cho khái niệm/định nghĩa; không dùng cho tin tức thời sự. |
| **Tool mới 2** | `tools/weather/tool.py` | Trả về thông tin nhiệt độ và thời tiết hiện tại theo thời gian thực. | Chỉ kích hoạt khi câu hỏi đề cập trực tiếp đến thời tiết địa điểm. |
| **Tool mới 3** | `tools/save_digest/tool.py` | Ghi bản tin Markdown ra file `.md` cục bộ trên hệ thống. | BẮT BUỘC qua `clarify(yes_no)` xác nhận trước khi gọi `confirmed=true`. |
| **Tool mới 4 (Bonus >3)** | `tools/calculator/tool.py` | Tính toán biểu thức số học an toàn bằng trình phân tích cú pháp Python. | Bị giới hạn trong phép tính thuần túy, từ chối mã hóa/lập trình phức tạp. |

## B6. Reflection

1. **System prompt vs Tools.yaml**:
   - Các quy tắc mang tính chiến lược chung (như quy tắc ngôn ngữ trả lời, quy định dừng hỏi lại khi thiếu thông tin bắt buộc, ranh giới Guardrail `yes_no`) thuộc về `system_prompt.md`.
   - Các chi tiết kỹ thuật của từng tham số (như định dạng `query`, enum `topic`, `timeframe`, mapping handle Twitter, quy định giữ nguyên keyword cho arXiv) thuộc về `tools.yaml`.
2. **Thủ công vs Tự động Review**:
   - Các ca test tự động (`run_eval.py`) chỉ kiểm tra xem agent có chọn đúng tool name và args hay không, nhưng không kiểm tra được nội dung ngôn ngữ trả lời (tiếng Việt/Anh) hoặc chất lượng văn bản tổng hợp. Các nội dung này đòi hỏi phải review thủ công qua giao diện Chat UI.
3. **Bài học cải tiến tiếp theo**:
   - Cần tăng cường phân biệt giữa URL bài viết thông thường (dùng `fetch`) và URL bài báo khoa học arXiv (dùng `paper_text`).
4. **Evidence integrity — hash không chỉ để trang trí**:
   - `version_log.csv` từng ghi `case_accuracy=0.75` cho v0 nhưng file run gốc không hề được commit — không kiểm chứng được, phải chạy lại v0 thật từ prompt gốc để có baseline hợp lệ.
   - Phát hiện `prompt_hash`/`tools_hash` ghi trong `version_log.csv` không khớp với đúng nội dung đã commit ở cùng thời điểm (do khác `core.autocrlf` giữa các máy trong team — Windows convert LF↔CRLF khi checkout, đổi hash dù nội dung y hệt). Thêm `.gitattributes` (`* text=auto eol=lf`) để mọi máy checkout ra cùng 1 hash, rồi chạy lại toàn bộ v1-v3 để chuỗi hash tự-verify được (hash trong CSV = hash trong run JSON = sha256 file thật trên đĩa).
5. **Model không hoàn toàn deterministic dù `temperature=0`**:
   - Chạy lại đúng 1 nội dung (hash giống hệt) 2 lần cho case_accuracy khác nhau (1.0 và 0.95, fail ở case khác nhau mỗi lần) — nhắc nhở không nên tin tuyệt đối vào 1 lần chạy, và evidence chính thức nên ghi rõ đây chỉ là 1 lần chạy cụ thể.
6. **Giới hạn từ API bên thứ 3, không sửa được bằng prompt engineering**:
   - RapidAPI Twitter API45 trả 403 "You are not subscribed to this API" — routing/args agent hoàn toàn đúng, chỉ là tài khoản RapidAPI của team chưa subscribe API. Không phải bug code.
   - Tavily với `timeframe=day` cho kết quả sai chủ đề khi không có tin thật trong 24h để khớp (case "Gemini 1.5 Pro") — giới hạn dữ liệu của search engine, `timeframe=week`/`general` cho kết quả đúng hơn.
7. **Bug tìm được qua tự dùng UI (dogfooding), không phải qua eval**:
   - Tool trace panel từng hiển thị trùng lặp toàn bộ câu trả lời cuối trong khung nhỏ chữ nghiêng — sửa chỉ hiện text khi round có gọi tool.
   - `max_tool_rounds` từng hardcode cứng = 4 trong backend UI, không nghe theo tham số nào — không được test vì CLI (`chat.py`) đã có `--max-tool-rounds` từ đầu nên tưởng đã hoạt động ở UI luôn.
   - Sidebar hiển thị "13 tool" nhưng đếm tay bị thiếu 2 tool (do hardcode danh sách) — sửa bằng cách thêm endpoint `/api/tools` để UI luôn lấy đúng danh sách từ `tools.yaml`, không lệch nữa dù ai đổi tool sau này.
   - Hội thoại UI từng gửi toàn bộ lịch sử không giới hạn mỗi request (không có window như CLI) — có thể phình token vô hạn nếu demo dài; sửa để mặc định giữ 5 cặp gần nhất giống CLI, và cho phép chỉnh qua dropdown.
