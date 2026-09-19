\# AI FINANCIAL COACH – INNOVATION PROTOTYPE



\## 1. Mục tiêu



Xây dựng một prototype web app có tên tạm thời \*\*AI Financial Coach\*\* nhằm chứng minh ý tưởng:



> AI có thể hiểu hồ sơ tài chính cá nhân, phân tích dòng tiền, đánh giá khả năng đạt mục tiêu và mô phỏng các kịch bản tài chính để hỗ trợ người dùng ra quyết định.



Prototype phục vụ demo Innovation của ngân hàng.



Không xây hệ thống banking production. Không cần giao dịch tiền thật. Không kết nối tài khoản ngân hàng thật ở MVP.



Ưu tiên:



1\. Demo trực quan.

2\. End-to-end flow hoàn chỉnh.

3\. AI thực sự tham gia vào reasoning.

4\. Financial calculations phải deterministic, không để LLM tự tính.

5\. Có thể deploy lên GreenNode.

6\. Kiến trúc đủ tốt để sau demo có thể mở rộng.



\---



\# 2. User persona



Tạo sẵn một demo persona:



Tên: Nguyễn Minh Anh



Tuổi: 28



Thu nhập hàng tháng: 30.000.000 VND



Chi phí hàng tháng: 18.000.000 VND



Tiết kiệm hiện tại: 200.000.000 VND



Khoản vay: 200.000.000 VND



Lãi suất khoản vay: 10%/năm



Mục tiêu:



Mua nhà trị giá 3.000.000.000 VND trong 5 năm.



Có thể thêm mục tiêu:



\* Kết hôn

\* Sinh con

\* Mua ô tô

\* Quỹ dự phòng

\* Đầu tư



\---



\# 3. Core user journey



Prototype phải có flow sau:



Landing Page

↓

Financial Profile

↓

Financial Health

↓

AI Financial Coach

↓

Goal Planner

↓

Scenario Simulator

↓

Personalized Action Plan



\---



\# 4. Landing page



Thiết kế hiện đại theo phong cách fintech/banking.



Headline:



"Hiểu tiền của bạn. Chủ động tương lai."



Subheadline:



"AI Financial Coach giúp bạn hiểu sức khỏe tài chính, lập mục tiêu và mô phỏng những quyết định quan trọng trước khi thực hiện."



CTA:



"Khám phá tài chính của tôi"



Secondary CTA:



"Try Demo"



Không sử dụng logo ngân hàng thật nếu chưa được cung cấp.



\---



\# 5. Financial Profile



Tạo màn hình nhập thông tin:



\## Personal



\* Age

\* Marital status

\* Number of dependents



\## Income



\* Monthly income

\* Other income



\## Expenses



\* Housing

\* Food

\* Transportation

\* Family

\* Entertainment

\* Other



\## Assets



\* Cash

\* Savings

\* Stocks

\* Real estate

\* Other



\## Liabilities



\* Loan balance

\* Interest rate

\* Monthly repayment



\## Goals



\* Goal type

\* Target amount

\* Target date



Cho phép user nhập dữ liệu hoặc chọn "Demo Data".



\---



\# 6. Financial Profile Engine



Sau khi submit dữ liệu, backend phải tính:



monthlyIncome



monthlyExpense



monthlyFreeCashFlow



savingRate



totalAssets



totalLiabilities



netWorth



debtToIncome



emergencyFundMonths



goalFundingGap



estimatedGoalDate



financialHealthScore



IMPORTANT:



Các phép tính này phải được thực hiện bằng backend Financial Engine.



KHÔNG để LLM tự tính các giá trị tài chính quan trọng.



\---



\# 7. Financial Health Score



Tạo Financial Health Score từ 0–100.



Có thể dùng MVP formula:



Cash Flow: 25%



Emergency Fund: 20%



Debt: 20%



Savings: 15%



Goal Progress: 20%



Score phải giải thích được.



Ví dụ:



Financial Health



78 / 100



Breakdown:



Cash Flow        21/25

Emergency Fund   15/20

Debt             14/20

Savings          13/15

Goal             15/20



Tạo recommendation cho từng component.



\---



\# 8. Dashboard



Dashboard phải có các card:



\## Financial Health



78 / 100



"Healthy"



\## Monthly Cash Flow



Income: 30M



Expense: 18M



Free Cash Flow: 12M



\## Net Worth



Tài sản - Nợ



\## Emergency Fund



Ví dụ:



3.8 months



\## Goal



"Buy a home"



3B target



Progress X%



5 years



\## AI Insight



Ví dụ:



"Bạn đang có khả năng tiết kiệm khoảng 12 triệu/tháng. Nếu duy trì tốc độ hiện tại, mục tiêu mua nhà sẽ cần điều chỉnh vốn tự có hoặc thời gian."



\---



\# 9. AI Financial Coach



Đây là tính năng quan trọng nhất.



Tạo chat interface.



User có thể hỏi:



"Thu nhập của tôi hiện tại có ổn không?"



"Tôi có nên mua nhà 3 tỷ không?"



"Nếu năm sau tôi có con thì sao?"



"Nếu tôi tăng thu nhập thêm 20% thì sao?"



"Tôi nên ưu tiên trả nợ hay tiết kiệm?"



AI phải sử dụng Financial Profile hiện tại làm context.



Không được trả lời generic.



Ví dụ:



USER:



"Nếu năm sau tôi có con thì sao?"



AI phải phân tích dựa trên:



current income



current expense



current savings



loan



current goals



dependents



Sau đó gọi Scenario Engine.



\---



\# 10. AI architecture



Implement AI orchestration theo mô hình:



User

↓

AI Orchestrator

↓

Intent Detection

↓

Tool Selection

↓

Financial Tools

↓

LLM

↓

Response



Các tool tối thiểu:



getFinancialProfile()



calculateCashFlow()



calculateFinancialHealth()



calculateGoalProjection()



simulateScenario()



getFinancialInsights()



AI KHÔNG được tự tính toán số tiền.



LLM chỉ:



\* hiểu intent

\* chọn tool

\* giải thích kết quả

\* tạo recommendation

\* giao tiếp tự nhiên



\---



\# 11. Scenario Simulator



Đây là "wow feature" của prototype.



Cho phép user chọn:



\### Scenario 1



Income +20%



\### Scenario 2



Income -20%



\### Scenario 3



Monthly expense +5M



\### Scenario 4



New child



\### Scenario 5



Buy car



\### Scenario 6



Buy house



\### Scenario 7



Loan interest +3%



Có thể combine nhiều scenario.



Ví dụ:



"Next year I have a child"



System thay đổi:



monthlyExpense += estimatedChildExpense



dependents += 1



Sau đó chạy lại Financial Engine.



Kết quả:



Current Scenario



Free Cash Flow: 12M



Goal Date: 2031



Future Scenario



Free Cash Flow: 7M



Goal Date: 2033



AI giải thích:



"Với giả định chi phí gia đình tăng thêm 5 triệu/tháng, khả năng tích lũy giảm khoảng 42%. Bạn có thể cân nhắc tăng thu nhập, giảm chi phí hoặc điều chỉnh thời điểm mua nhà."



Tất cả số liệu phải lấy từ Scenario Engine.



\---



\# 12. Goal Planner



User nhập:



Goal:



"Mua nhà"



Target:



3.000.000.000 VND



Time:



5 years



System tính:



Current savings



Monthly saving capacity



Expected savings



Funding gap



Required monthly saving



Estimated target date



Tạo 3 scenarios:



Conservative



Base



Optimistic



Ví dụ:



Conservative:

Monthly saving = 8M



Base:

Monthly saving = 12M



Optimistic:

Monthly saving = 15M



Hiển thị chart.



\---



\# 13. AI-generated Financial Action Plan



Sau khi phân tích, AI tạo:



\## My Financial Action Plan



\### Priority 1



Build emergency fund



Target: 100M



\### Priority 2



Control discretionary spending



Target saving increase: +2M/month



\### Priority 3



Debt optimization



Review loan repayment



\### Priority 4



House goal



Increase monthly investment/saving capacity



Action plan phải dựa trên Financial Engine output.



\---



\# 14. AI insight cards



Dashboard có 3–5 AI insights.



Ví dụ:



"Your strongest area"



"Cash flow"



"Bạn đang giữ được 40% thu nhập mỗi tháng."



"Watch out"



"Debt"



"Khoản vay đang chiếm X% thu nhập."



"Opportunity"



"Nếu tăng tiết kiệm thêm 3M/tháng, thời gian đạt mục tiêu có thể rút ngắn X tháng."



Các con số phải được backend tính trước.



\---



\# 15. AI Guardrails



AI không được:



\* tự bịa dữ liệu

\* tự tính số tiền

\* đưa ra khẳng định chắc chắn về lợi nhuận đầu tư

\* giả lập tư vấn ngân hàng chính thức

\* nói rằng người dùng chắc chắn được duyệt khoản vay

\* khẳng định một khoản đầu tư chắc chắn sinh lời



AI phải sử dụng ngôn ngữ:



"ước tính"



"theo giả định"



"có thể"



"nên cân nhắc"



Đối với investment:



AI chỉ cung cấp educational information trong prototype.



\---



\# 16. RAG



Implement RAG architecture nhưng MVP có thể dùng một knowledge base nhỏ.



Documents:



\* Personal finance basics

\* Emergency fund

\* Debt management

\* Budgeting

\* Goal planning

\* Financial education



Có metadata:



title



source



version



effectiveDate



category



RAG chỉ dùng để giải thích kiến thức.



Financial calculations vẫn do Financial Engine thực hiện.



Nếu chưa có vector database, implement abstraction:



KnowledgeService



Có thể bắt đầu bằng PostgreSQL + pgvector hoặc vector DB phù hợp với môi trường GreenNode.



\---



\# 17. Multi-Agent



MVP cần abstraction cho Multi-Agent nhưng không cần quá phức tạp.



Agents:



1\. Profile Agent

2\. Cash Flow Agent

3\. Goal Agent

4\. Risk Agent

5\. Financial Coach Agent



Architecture:



Financial Coach Agent

↓

Profile Agent

Cash Flow Agent

Goal Agent

Risk Agent



Các agent sử dụng shared Financial Profile.



Không tạo agent nếu một service/function là đủ.



Ưu tiên reliability hơn "agent hype".



\---



\# 18. Backend



Preferred stack:



Java 21 nếu môi trường cho phép.



Spring Boot 3.x.



REST API.



PostgreSQL.



Redis optional.



Docker.



API structure:



/api/profile



/api/financial-health



/api/cashflow



/api/goals



/api/scenarios



/api/ai/chat



/api/insights



\---



\# 19. Database



Create tables:



users



financial\_profiles



income\_records



expense\_records



assets



liabilities



financial\_goals



scenarios



financial\_insights



chat\_sessions



chat\_messages



knowledge\_documents



AI interaction logs



Không lưu dữ liệu nhạy cảm không cần thiết.



\---



\# 20. Frontend



Preferred:



React



TypeScript



Vite



TailwindCSS



Chart library:



Recharts



UI style:



Modern banking fintech.



Responsive.



Desktop-first cho demo nhưng mobile responsive.



Các màn hình:



/



/onboarding



/profile



/dashboard



/goals



/scenarios



/coach



\---



\# 21. Dashboard visualization



Cần có:



\* Financial Health gauge

\* Income vs Expense chart

\* Net Worth card

\* Goal progress bar

\* Scenario comparison chart

\* AI Insights



Scenario chart phải cho phép:



Current



Scenario A



Scenario B



So sánh:



Net Worth



Savings



Goal Date



Monthly Cash Flow



\---



\# 22. Demo mode



Cực kỳ quan trọng.



Tạo button:



"Load Demo Persona"



Click một lần → toàn bộ dữ liệu demo được load.



Không cần nhập từng field khi trình diễn.



Demo persona phải cho ra kết quả đẹp và dễ hiểu.



\---



\# 23. Demo script



Prototype phải hỗ trợ demo flow 3 phút:



STEP 1



Open dashboard.



"Đây là Financial Profile của một khách hàng 28 tuổi."



STEP 2



Show:



Income



Expense



Assets



Debt



Financial Health



STEP 3



Ask AI:



"Tôi muốn mua nhà 3 tỷ trong 5 năm. Tôi có khả thi không?"



AI trả lời bằng dữ liệu thực tế.



STEP 4



Ask:



"Nếu năm sau tôi có con thì sao?"



Click:



Scenario → New Child



Show chart.



STEP 5



Ask:



"Nếu thu nhập tăng 20% thì sao?"



Show second scenario.



STEP 6



AI tạo:



Personal Financial Action Plan.



Closing message:



"AI không chỉ trả lời câu hỏi tài chính. AI hiểu tình hình hiện tại, mô phỏng tương lai và giúp khách hàng chủ động ra quyết định."



\---



\# 24. API contract



Create OpenAPI documentation.



Important endpoints:



POST /api/profile



GET /api/profile/{userId}



GET /api/dashboard/{userId}



GET /api/financial-health/{userId}



POST /api/goals



POST /api/scenarios/simulate



POST /api/ai/chat



GET /api/insights/{userId}



\---



\# 25. AI provider abstraction



Do NOT hard-code application directly to one LLM provider.



Create:



LLMProvider



OpenAIProvider



CompatibleLLMProvider



MockLLMProvider



Environment variable:



LLM\_PROVIDER



LLM\_API\_KEY



LLM\_MODEL



Prototype must work in Mock AI mode if API key is unavailable.



\---



\# 26. Deployment



Application must be Dockerized.



Create:



Dockerfile



docker-compose.yml



.env.example



README.md



Deployment documentation for GreenNode.



Recommended containers:



frontend



backend



postgres



optional redis



If GreenNode provides managed PostgreSQL, support DATABASE\_URL.



Environment variables:



DATABASE\_URL



LLM\_API\_KEY



LLM\_MODEL



JWT\_SECRET



APP\_ENV



CORS\_ORIGINS



VECTOR\_DB\_URL



\---



\# 27. Security



Prototype security requirements:



\* Never commit API keys.

\* Use .env.

\* Validate all input.

\* Sanitize AI prompts.

\* Never expose internal system prompts.

\* Never expose database credentials.

\* Basic authentication/session handling.

\* Mask sensitive financial information in logs.

\* Do not log raw financial data unnecessarily.



\---



\# 28. Observability



Add structured logs.



Important events:



profile.created



profile.updated



scenario.created



goal.created



ai.request



ai.response



financial.calculation



Use correlationId.



AI requests should have:



requestId



userId



intent



toolCalls



latency



model



token usage if available



\---



\# 29. Testing



Create unit tests for:



CashFlowCalculator



NetWorthCalculator



DebtRatioCalculator



EmergencyFundCalculator



GoalProjectionCalculator



ScenarioSimulator



FinancialHealthCalculator



Create integration tests for:



Profile API



Goal API



Scenario API



AI Chat API



Create one end-to-end test:



Demo Persona

→ Dashboard

→ Ask AI

→ Scenario

→ Action Plan



\---



\# 30. Acceptance criteria



Prototype is considered complete only if:



1\. Application runs with Docker Compose.

2\. Frontend and backend communicate successfully.

3\. Demo persona can be loaded with one click.

4\. Dashboard displays financial profile.

5\. Financial Health Score is calculated by backend.

6\. Goal projection works.

7\. Scenario simulation works.

8\. AI Chat understands financial profile.

9\. AI can call financial tools.

10\. AI response contains actual calculated values.

11\. AI can explain scenario differences.

12\. AI Action Plan is generated.

13\. Application is deployable to GreenNode.

14\. README contains exact deployment steps.

15\. No secrets are committed.

16\. Application has graceful fallback when LLM is unavailable.



\---



\# 31. Development priority



Implement in this order:



PHASE 1

Project skeleton



PHASE 2

Database + Financial Profile



PHASE 3

Financial Engine



PHASE 4

Dashboard



PHASE 5

Goal Planner



PHASE 6

Scenario Simulator



PHASE 7

AI Chat + Tool Calling



PHASE 8

AI Insights + Action Plan



PHASE 9

RAG



PHASE 10

Polish UI



PHASE 11

Testing



PHASE 12

Docker + GreenNode deployment



Do not implement RAG or complex Multi-Agent architecture before the core financial engine works.



\---



\# 32. Definition of "AI"



The prototype must demonstrate real AI capability.



The AI must be able to:



1\. Understand natural language financial questions.

2\. Identify user intent.

3\. Access Financial Profile.

4\. Select appropriate financial tools.

5\. Execute scenario simulations.

6\. Interpret numerical results.

7\. Explain results naturally.

8\. Generate personalized action plans.

9\. Use RAG for financial education.

10\. Maintain conversation context.



Example:



User:



"If I have a baby next year, can I still buy the house in five years?"



Expected internal flow:



Intent Detection

→ Scenario Simulation

→ Financial Engine

→ Goal Projection

→ Risk Analysis

→ LLM Explanation



Not:



User

→ LLM

→ hallucinated answer.



\---



\# 33. Future roadmap



Design the code so it can later support:



Open Banking



Real transaction categorization



Bank account integration



Credit profile



Personalized banking products



Insurance



Investment education



Financial health monitoring



Proactive AI notifications



Enterprise analytics



Do not implement these in MVP unless trivial.



\---



\# 34. Final deliverables



Repository must contain:



/frontend



/backend



/infrastructure



/docs



README.md



PROJECT\_SPEC.md



docker-compose.yml



.env.example



OpenAPI specification



Architecture diagram



Database ERD



Demo script



Test report



Deployment guide



The final README must contain:



1\. Architecture

2\. Local setup

3\. Environment variables

4\. Running locally

5\. Running tests

6\. Docker deployment

7\. GreenNode deployment

8\. Demo credentials

9\. Demo scenario

10\. Known limitations



Before finishing, run:



\* build

\* unit tests

\* integration tests

\* Docker build

\* Docker Compose startup

\* API health check

\* frontend health check



Fix all build/runtime errors before reporting completion.



