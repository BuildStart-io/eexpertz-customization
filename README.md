# eexpertz Customizations (`eexpertz-customization`)

This repository contains the custom features and system enhancements built for **eexpertz Academy** (Alibaba Selling Master Courses):

---

### 1. 🔄 Automated Modular Message Sets Engine (`/dashboard/settings` → Automated Message Sets)
- **Full Granular Customization**:
  - Every individual message and media block is editable (Name/Title, Content, Media Attachment, Captions, Sequence Order).
  - Ability to delete individual items, add new items (`+ Text`, `+ Audio / Voice Note`, `+ Image`, `+ Video`, `+ Document`), and reorder sequence using Up/Down controls.
- **Set 1 (Welcome Sequence)**:
  - Automatically dispatched on the customer's first inbound message.
  - Includes audio voice note introduction, course fee inquiry guidance text, student feedback/earnings proof link (`feedbacks.eexpertzacademy.com`), and course module preview graphics.
- **Set 2 (Discounts & Limited-Time Urgency)**:
  - Automatically dispatched on any follow-up message from inquirers.
  - Contains discount guarantee details (LKR 4,900 promo price vs LKR 10,900 regular price), discount explanation voice notes, spots remaining urgency updates, and bonus modules.
  - **Time-Restricted Delivery**: Supports daily cutoff checks (e.g. 14:00 Sri Lanka time) so limited-time bonus offers are only sent before the deadline.
- **Set 3 (Course Fee & Bank Details)**:
  - Dispatched strictly when the customer asks for course fees, pricing, or payment accounts across English, Sinhala Unicode, or Singlish keywords.
  - Delivers complete bank transfer details for NDB Bank, Sampath Bank, and BOC Bank, payment confirmation instructions, and remaining spot updates.
- **Custom Message Sets**:
  - Create unlimited custom sequential message sets with custom trigger keywords and full multi-media support.

---

### 2. 🧾 Payment Slip Intake & Student Verification Workflow
- **Automated Receipt Proof Detection**:
  - Detects image and PDF payment slips sent by students.
  - Automatically prompts the student to submit their **Full Name**, **Email Address**, and **Phone Number**.
- **`Slip Sent` Stage Tracking**:
  - Marks students as **`Slip Sent`** (`pending_verification`) rather than auto-enrolling them.
  - Logs a pending order in the system with extracted student contact details for administrative verification.
- **Verification Confirmation**:
  - Sends an automated receipt acknowledgment reassuring the student that their payment is being verified and course access will be activated within 1 hour.

---

### 3. ⏸️ "Pay Later" Intent Detection & Automated Takeover
- **Multilingual Intent Recognition**:
  - Detects deferred payment responses across English, Sinhala Unicode (`පස්සෙ ගෙවන්නම්`, `පස්සෙ දාන්නම්`, `ලබන මාසෙ`, `සැලරි හම්බුනාම`, `දැනට බැහැ`, etc.), and Singlish (`passe dannam`, `passe gewannam`, `after salary`, etc.).
- **Graceful Closing & Bot Takeover**:
  - Sends a customizable polite closing message (*"හොඳයි, ඔබට පහසු වේලාවක අප හා සම්බන්ධ වන්න. ස්තූතියි! ☺️"*).
  - Sets student stage to **`Pay Later`** (`pay_later`).
  - Automatically engages **Chat Takeover** (`is_taken_over = true`) to prevent subsequent automated sets or bot replies from firing.

---

### 4. 👥 Customers Management Dashboard (`/dashboard/customers`)
- **Verified Students Directory**:
  - Filtered exclusively to show students who have submitted their payment slips and contact details.
  - Clean table layout displaying Student Name, Phone Number, Email Address, Submitted Receipt Proof, Stage Badge, and Enrollment Status.
- **Click-to-Copy Contact Details**:
  - Direct one-click clipboard copy on clicking phone numbers and email addresses.
- **Manual Enroll / Unenroll Toggle**:
  - One-click **`Enroll`** action for students with `Slip Sent` status.
  - Direct **`Unenroll`** action button for already enrolled students.

---

### 5. 💬 Live Chats with Contact Preview Badges (`/dashboard/conversations`)
- **Stage Badges on Chat Preview Cards**:
  - Displays customer stage badges directly on the left conversation list cards (**`Set 1`**, **`Set 2`**, **`Set 3`**, **`Slip Sent`**, **`Enrolled`**, **`Pay Later`**) for immediate customer stage visibility.
- **Multi-Media Message Support**:
  - Renders voice notes, images, videos, documents, and interactive transcripts cleanly.

---

### 6. 🗄️ Isolated Database Schema & Suffixed Edge Functions (`eexpertz_customization`)
- **Schema Isolation**:
  - All application tables and logic live in a dedicated `eexpertz_customization` schema to avoid data or trigger mixing.
- **Dedicated Auth Triggers**:
  - `on_auth_user_created_eexpertz`, `on_auth_user_role_eexpertz`, and `on_auth_user_settings_eexpertz` on `auth.users`.
- **Suffixed Edge Functions**:
  - Custom edge functions deployed with `-eexpertz` suffix (`process-message-eexpertz`, `ai-chat-eexpertz`, `send-whatsapp-eexpertz`, `webhook-wsender-eexpertz`, `wsender-sessions-eexpertz`, `media-storage-eexpertz`, etc.).

